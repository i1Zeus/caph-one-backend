import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { UnitsService } from '../../inventory/units/units.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceType } from '../invoice-configs/dto';
import { InvoiceConfigsService } from '../invoice-configs/invoice-configs.service';
import {
  CreatePurchaseInvoiceDto,
  ReturnPurchaseInvoiceDto,
  UpdatePurchaseInvoiceDto,
} from './dto';

@Injectable()
export class PurchaseInvoicesService {
  private readonly logger = new Logger(PurchaseInvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceConfigsService: InvoiceConfigsService,
    private unitsService: UnitsService,
  ) {}

  /**
   * Generate automatic invoice number in format: PUR-YYYY-####
   * Example: PUR-2025-0001, PUR-2025-0002
   */
  private async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = 'PUR';
    // const pattern = `${prefix}-${currentYear}-%`;

    // Find the last invoice with the current year pattern
    const lastInvoice = await this.prisma.purchaseInvoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `${prefix}-${currentYear}-`,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      // Extract the number part from the last invoice (e.g., "PUR-2025-0001" -> "0001")
      const parts = lastInvoice.invoiceNumber.split('-');
      if (parts.length === 3) {
        const lastNumber = parseInt(parts[2], 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    // Format as 4-digit number with leading zeros
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}-${currentYear}-${formattedNumber}`;
  }

  async create(
    createPurchaseInvoiceDto: CreatePurchaseInvoiceDto,
    userId?: string,
  ) {
    const {
      supplierId,
      totalAmount,
      paidAmount = 0,
      currencyId,
      items,
      warehouseId,
      discount = 0,
      discountType = 'FIXED',
      ...rest
    } = createPurchaseInvoiceDto;

    // Verify that the client exists
    const supplier = await this.prisma.client.findUnique({
      where: { id: supplierId },
      include: { account: true },
    });

    if (!supplier) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Validate items and warehouse if provided
    if (items && items.length > 0) {
      if (!warehouseId) {
        throw new BadRequestException('المخزن مطلوب عند إضافة أصناف للفاتورة');
      }

      // Verify warehouse exists
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId, isDeleted: false },
      });

      if (!warehouse) {
        throw new NotFoundException('المخزن غير موجود');
      }

      // Validate products
      for (const item of items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId, isDeleted: false },
        });

        if (!product) {
          throw new NotFoundException(
            `المنتج بالمعرف ${item.productId} غير موجود`,
          );
        }
      }
    }

    // Apply discount to totalAmount
    let discountAmount = 0;
    let finalTotalAmount = totalAmount;
    const subtotalBeforeDiscount = totalAmount; // Store original subtotal before discount

    if (discount > 0) {
      // Validate discount
      if (discountType === 'PERCENTAGE') {
        if (discount > 100) {
          throw new BadRequestException('نسبة الخصم يجب أن لا تتجاوز 100%');
        }
        discountAmount = (totalAmount * discount) / 100;
      } else {
        // FIXED discount
        if (discount > totalAmount) {
          throw new BadRequestException(
            'قيمة الخصم يجب أن لا تتجاوز المبلغ الإجمالي',
          );
        }
        discountAmount = discount;
      }
      finalTotalAmount = totalAmount - discountAmount;
    }

    // Calculate remaining amount based on final total after discount
    const remainingAmount = finalTotalAmount - paidAmount;

    // Determine status based on payment (using finalTotalAmount after discount)
    let status: InvoiceStatus = InvoiceStatus.UNPAID;
    if (paidAmount > 0) {
      status =
        paidAmount >= finalTotalAmount
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL;
    }

    // Validate provided invoice number if exists (but don't check for duplicates yet - will be caught by unique constraint)
    const providedInvoiceNumber = createPurchaseInvoiceDto.invoiceNumber;

    if (providedInvoiceNumber) {
      // Check if provided invoice number already exists
      const existingInvoice = await this.prisma.purchaseInvoice.findUnique({
        where: { invoiceNumber: providedInvoiceNumber },
      });

      if (existingInvoice) {
        throw new BadRequestException('رقم الفاتورة موجود مسبقاً');
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Generate invoice number inside transaction to prevent race conditions
      let invoiceNumber = providedInvoiceNumber;

      if (!invoiceNumber) {
        // Auto-generate invoice number if not provided
        invoiceNumber = await this.generateInvoiceNumber();
      }

      // 2. Create the purchase invoice
      const invoice = await prisma.purchaseInvoice.create({
        data: {
          ...rest,
          invoiceNumber,
          supplierId,
          totalAmount: finalTotalAmount,
          paidAmount,
          remainingAmount,
          subtotalBeforeDiscount,
          status,
          userId,
          currencyId,
          discount,
          discountType,
          invoiceDate: createPurchaseInvoiceDto.invoiceDate
            ? new Date(createPurchaseInvoiceDto.invoiceDate)
            : new Date(),
          dueDate: createPurchaseInvoiceDto.dueDate
            ? new Date(createPurchaseInvoiceDto.dueDate)
            : undefined,
        },
        include: {
          supplier: true,
          currency: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 3. Create invoice items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await prisma.purchaseInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: item.productId,
              unitId: item.unitId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            },
          });
        }

        // 4. Create warehouse transaction for inventory movement
        const warehouseTransaction = await prisma.warehouseTransaction.create({
          data: {
            type: 'PURCHASE',
            fromWarehouseId: null,
            toWarehouseId: warehouseId,
            totalPrice: finalTotalAmount,
            date: new Date(),
            note: `فاتورة شراء رقم ${invoice.invoiceNumber}`,
            partyName: supplier?.name || 'مورد غير محدد',
            referenceNumber: invoice.invoiceNumber,
            userId: userId,
            purchaseInvoiceId: invoice.id,
          },
        });

        // 5. Create warehouse transaction items and update stock
        for (const item of items) {
          // Get product details to determine proper units for conversion
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: {
              purchaseUnit: true,
              salesUnit: true,
            },
          });

          if (!product) {
            throw new NotFoundException(
              `المنتج بالمعرف ${item.productId} غير موجود`,
            );
          }

          // Determine the storage unit and conversion
          let storageUnitId =
            item.unitId || product.purchaseUnitId || product.salesUnitId;
          let convertedQuantity = item.quantity;

          // If user provided a different unit than the product's default storage unit, convert it
          if (item.unitId && storageUnitId && item.unitId !== storageUnitId) {
            try {
              const conversionResult = await this.unitsService.convertQuantity(
                item.quantity,
                item.unitId,
                storageUnitId,
              );
              convertedQuantity = conversionResult.convertedQuantity;
              console.log(
                `🔄 Purchase: Converted ${item.quantity} (unit ${item.unitId}) to ${convertedQuantity} (unit ${storageUnitId})`,
              );
            } catch (error) {
              console.error('Unit conversion failed:', error);
              // If conversion fails, use the provided unit as storage unit
              storageUnitId = item.unitId;
              convertedQuantity = item.quantity;
            }
          }

          await prisma.warehouseTransactionItem.create({
            data: {
              transactionId: warehouseTransaction.id,
              productId: item.productId,
              quantity: item.quantity, // Original quantity in the unit specified
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              trackingId: item.trackingId || null,
              unitId: item.unitId || null,
              itemNote: `شراء من فاتورة ${invoice.invoiceNumber}`,
            },
          });

          // Update or create stock and tracking
          const existingStock = await prisma.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: warehouseId,
              },
            },
          });

          if (!existingStock) {
            // Create new stock record
            await prisma.stock.create({
              data: {
                productId: item.productId,
                warehouseId: warehouseId,
              },
            });
          }

          // Create or update tracking with converted quantity
          if (item.trackingId) {
            // Update existing tracking with converted quantity
            await prisma.tracking.update({
              where: { id: item.trackingId },
              data: {
                quantity: {
                  increment: convertedQuantity, // Use converted quantity
                },
                // Update storage unit if different
                storageUnitId: storageUnitId,
              },
            });
            console.log(
              `📦 Purchase: Updated tracking ${item.trackingId} with +${convertedQuantity} (unit ${storageUnitId})`,
            );
          } else if (item.newTracking) {
            // Create new tracking with provided tracking data
            const stock = await prisma.stock.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: warehouseId,
                },
              },
            });

            if (stock) {
              const trackingData: any = {
                stockId: stock.id,
                trackingType: item.newTracking.trackingType || 'NONE',
                quantity: convertedQuantity, // Use converted quantity
                storageUnitId: item.newTracking.storageUnitId || storageUnitId,
              };

              // Add LOT-specific fields
              if (item.newTracking.trackingType === 'LOT') {
                if (item.newTracking.lotNumber)
                  trackingData.lotNumber = item.newTracking.lotNumber;
                if (item.newTracking.batchName)
                  trackingData.batchName = item.newTracking.batchName;
                if (item.newTracking.productionDate)
                  trackingData.productionDate = new Date(
                    item.newTracking.productionDate,
                  );
                if (item.newTracking.expiryDate)
                  trackingData.expiryDate = new Date(
                    item.newTracking.expiryDate,
                  );
              }

              // Add SERIAL-specific fields
              if (item.newTracking.trackingType === 'SERIAL') {
                if (item.newTracking.serialNumber)
                  trackingData.serialNumber = item.newTracking.serialNumber;
              }

              // Add optional fields
              if (item.newTracking.supplierName)
                trackingData.supplierName = item.newTracking.supplierName;
              if (item.newTracking.notes)
                trackingData.notes = item.newTracking.notes;

              await prisma.tracking.create({ data: trackingData });
              console.log(
                `📦 Purchase: Created new ${item.newTracking.trackingType} tracking with ${convertedQuantity} (unit ${storageUnitId})`,
              );
            }
          } else {
            // Create basic tracking for products without specific tracking
            const stock = await prisma.stock.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: warehouseId,
                },
              },
            });

            if (stock) {
              await prisma.tracking.create({
                data: {
                  stockId: stock.id,
                  trackingType: 'NONE',
                  quantity: convertedQuantity, // Use converted quantity
                  storageUnitId: storageUnitId,
                },
              });
              console.log(
                `📦 Purchase: Created basic tracking with ${convertedQuantity} (unit ${storageUnitId})`,
              );
            }
          }
        }
      }

      // 6. Create accounting transaction using configuration (only if invoiceConfigId is provided)
      if (createPurchaseInvoiceDto.invoiceConfigId) {
        await this.createAutomaticAccountingTransaction(
          prisma,
          invoice,
          supplier,
          finalTotalAmount,
          paidAmount,
          createPurchaseInvoiceDto.invoiceConfigId,
        );
      }

      return invoice;
    });
  }

  private async createAutomaticAccountingTransaction(
    prisma: any,
    invoice: any,
    supplier: any,
    totalAmount: number,
    paidAmount: number,
    invoiceConfigId?: number,
  ) {
    try {
      // الحصول على التكوين المحدد
      const config = await this.invoiceConfigsService.findById(invoiceConfigId);

      if (!config || !config.isActive) {
        throw new BadRequestException('تكوين الفاتورة غير صالح أو غير نشط');
      }

      console.log('=== PURCHASE INVOICE CONFIG DEBUG ===');
      console.log('Using invoice config ID:', invoiceConfigId);
      console.log('Config:', config);
      console.log('=== CALLING createAutomaticTransactionFromConfig ===');

      // إنشاء المعاملة التلقائية باستخدام التكوين المحدد
      const transaction =
        await this.invoiceConfigsService.createAutomaticTransactionFromConfig(
          config,
          totalAmount,
          `فاتورة شراء #${invoice.invoiceNumber} - ${supplier.name}`,
          supplier.id,
          null, // لا نمرر invoiceId هنا لتجنب foreign key constraint
        );

      // ربط المعاملة بالفاتورة بعد إنشائها
      if (transaction) {
        try {
          await this.invoiceConfigsService.linkTransactionToInvoice(
            transaction.id,
            InvoiceType.PURCHASE,
            invoice.id,
            prisma, // Pass the transactional prisma client
          );
        } catch (linkError) {
          console.error('فشل في ربط المعاملة بالفاتورة:', linkError);
          // لا نريد أن نفشل العملية كاملة بسبب مشكلة في الربط
          // المعاملة تم إنشاؤها بنجاح والفاتورة أيضاً
        }
      }

      console.log('=== createAutomaticTransactionFromConfig SUCCESS ===');

      // تحديث رصيد المورد
      // لا نحتاج تحديث رصيد المورد - يُحسب من الحسابات المحاسبية
    } catch (error) {
      // إذا لم يتم العثور على تكوين، ارفع الخطأ
      console.error('تعذر العثور على تكوين محاسبي للفاتورة:', error.message);
      throw new BadRequestException(
        `لا يمكن إنشاء معاملة محاسبية: ${error.message}`,
      );
    }
  }

  async findAll(filters: any = {}) {
    const {
      supplierId,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      includeReturns = 'false',
    } = filters;

    // Parse page and limit to integers
    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());

    const where: any = {
      isDeleted: false,
    };

    // By default, exclude return invoices unless explicitly requested
    if (includeReturns !== 'true') {
      where.isReturn = false;
    }

    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    if (status) {
      if (status.includes(',')) {
        where.status = {
          in: status.split(',').map((s: string) => s.trim()),
        };
      } else {
        where.status = status;
      }
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.invoiceDate.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [invoices, totalCount] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
              type: true,
            },
          },
          currency: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            where: { isDeleted: false },
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          returnInvoices: {
            where: { isDeleted: false },
            include: {
              items: {
                include: {
                  product: { select: { id: true, name: true, barcode: true } },
                  unit: { select: { id: true, name: true, symbol: true } },
                },
              },
            },
          },
          returnInvoicesNew: {
            where: { isDeleted: false },
            select: {
              id: true,
              netAmount: true,
              items: {
                include: {
                  product: { select: { id: true, name: true, barcode: true } },
                  unit: { select: { id: true, name: true, symbol: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);

    // Calculate effective amounts for each invoice
    const invoicesWithEffectiveAmounts = invoices.map((invoice) => {
      const totalReturnedAmount = (invoice.returnInvoicesNew || []).reduce(
        (sum, ret) => sum + Number(ret.netAmount),
        0,
      );

      const originalNetAmount = Number(invoice.totalAmount);
      const effectiveNetAmount = originalNetAmount - totalReturnedAmount;
      const effectivePaidAmount = Math.min(
        Number(invoice.paidAmount),
        effectiveNetAmount,
      );
      const effectiveRemainingAmount = effectiveNetAmount - effectivePaidAmount;

      let effectiveStatus: InvoiceStatus = InvoiceStatus.UNPAID;
      if (effectivePaidAmount > 0) {
        effectiveStatus =
          effectivePaidAmount >= effectiveNetAmount
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIAL;
      }
      if (effectiveNetAmount <= 0) {
        effectiveStatus = InvoiceStatus.CANCELLED;
      }

      return {
        ...invoice,
        effectiveAmounts: {
          effectiveNetAmount,
          effectivePaidAmount,
          effectiveRemainingAmount,
          effectiveStatus,
          originalNetAmount,
          originalPaidAmount: Number(invoice.paidAmount),
          originalRemainingAmount: Number(invoice.remainingAmount),
          totalReturnedAmount,
        },
      };
    });

    return {
      invoices: invoicesWithEffectiveAmounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    };
  }

  /**
   * Get effective amounts considering returns
   */
  async getEffectiveAmounts(invoiceId: number) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId, isDeleted: false },
      include: {
        returnInvoicesNew: {
          where: { isDeleted: false },
          select: {
            id: true,
            netAmount: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاتورة الشراء غير موجودة');
    }

    // Calculate total returned amount
    const totalReturnedAmount = (invoice.returnInvoicesNew || []).reduce(
      (sum, ret) => sum + Number(ret.netAmount),
      0,
    );

    // Calculate effective amounts
    const originalNetAmount = Number(invoice.totalAmount);
    const effectiveNetAmount = originalNetAmount - totalReturnedAmount;
    const effectivePaidAmount = Math.min(
      Number(invoice.paidAmount),
      effectiveNetAmount,
    );
    const effectiveRemainingAmount = effectiveNetAmount - effectivePaidAmount;

    // Determine status
    let effectiveStatus: InvoiceStatus = InvoiceStatus.UNPAID;
    if (effectivePaidAmount > 0) {
      effectiveStatus =
        effectivePaidAmount >= effectiveNetAmount
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL;
    }
    if (effectiveNetAmount <= 0) {
      effectiveStatus = InvoiceStatus.CANCELLED;
    }

    return {
      effectiveNetAmount,
      effectivePaidAmount,
      effectiveRemainingAmount,
      effectiveStatus,
      originalNetAmount,
      originalPaidAmount: Number(invoice.paidAmount),
      originalRemainingAmount: Number(invoice.remainingAmount),
      totalReturnedAmount,
    };
  }

  async findOne(id: number) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id, isDeleted: false },
      include: {
        supplier: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        currency: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
            unit: true,
          },
        },
        payments: {
          where: { isDeleted: false },
          include: {
            account: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        returnInvoices: {
          where: { isDeleted: false },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
                unit: { select: { id: true, name: true, symbol: true } },
              },
            },
          },
        },
        originalInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`فاتورة الشراء مع المعرف ${id} غير موجودة`);
    }

    // Calculate effective amounts
    const effectiveAmounts = await this.getEffectiveAmounts(id);

    return {
      ...invoice,
      effectiveAmounts,
    };
  }

  async update(id: number, updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto) {
    const existingInvoice = await this.findOne(id);

    // If updating amounts or discount, recalculate
    const { totalAmount, paidAmount, discount, discountType, ...rest } =
      updatePurchaseInvoiceDto;

    let updateData: any = { ...rest };

    if (
      totalAmount !== undefined ||
      paidAmount !== undefined ||
      discount !== undefined ||
      discountType !== undefined
    ) {
      // Get current or new values
      // totalAmount in DTO represents the original subtotal before discount
      const newSubtotalBeforeDiscount =
        totalAmount !== undefined
          ? totalAmount
          : existingInvoice.subtotalBeforeDiscount
            ? Number(existingInvoice.subtotalBeforeDiscount)
            : Number(existingInvoice.totalAmount); // Fallback for old invoices
      const newPaidAmount = paidAmount ?? existingInvoice.paidAmount;
      const newDiscount =
        discount ??
        (existingInvoice.discount ? Number(existingInvoice.discount) : 0);
      const newDiscountType =
        discountType ?? existingInvoice.discountType ?? 'FIXED';

      // Apply discount to subtotalBeforeDiscount
      let discountAmount = 0;
      let finalTotalAmount = newSubtotalBeforeDiscount;

      if (newDiscount > 0) {
        if (newDiscountType === 'PERCENTAGE') {
          if (newDiscount > 100) {
            throw new BadRequestException('نسبة الخصم يجب أن لا تتجاوز 100%');
          }
          discountAmount = (newSubtotalBeforeDiscount * newDiscount) / 100;
        } else {
          // FIXED discount
          if (newDiscount > newSubtotalBeforeDiscount) {
            throw new BadRequestException(
              'قيمة الخصم يجب أن لا تتجاوز المبلغ الإجمالي',
            );
          }
          discountAmount = newDiscount;
        }
        finalTotalAmount = newSubtotalBeforeDiscount - discountAmount;
      }

      const remainingAmount = finalTotalAmount - Number(newPaidAmount);

      let status: InvoiceStatus = InvoiceStatus.UNPAID;
      if (Number(newPaidAmount) > 0) {
        status =
          Number(newPaidAmount) >= finalTotalAmount
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIAL;
      }

      updateData = {
        ...updateData,
        subtotalBeforeDiscount: newSubtotalBeforeDiscount,
        totalAmount: finalTotalAmount,
        paidAmount: newPaidAmount,
        remainingAmount,
        status,
        discount: newDiscount,
        discountType: newDiscountType,
      };
    }

    return this.prisma.purchaseInvoice.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        currency: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    // const invoice = await this.findOne(id);

    // Check if there are related transactions
    const transactionCount = await this.prisma.transaction.count({
      where: {
        isDeleted: false,
        // Add specific field check here if purchaseInvoiceId exists in schema
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف فاتورة مرتبطة بمعاملات محاسبية',
      );
    }

    // Soft delete
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'تم حذف فاتورة الشراء بنجاح' };
  }

  async getInvoicesSummary(filters: any = {}) {
    const { supplierId, status, startDate, endDate } = filters;

    const where: any = {
      isDeleted: false,
    };

    if (supplierId) where.supplierId = parseInt(supplierId);
    if (status) where.status = status;

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const [totalInvoices, summary] = await Promise.all([
      this.prisma.purchaseInvoice.count({ where }),
      this.prisma.purchaseInvoice.aggregate({
        where,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),
    ]);

    const statusSummary = await this.prisma.purchaseInvoice.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: {
        totalAmount: true,
        remainingAmount: true,
      },
    });

    return {
      totalInvoices,
      totalAmount: summary._sum.totalAmount || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalRemaining: summary._sum.remainingAmount || 0,
      averageAmount: summary._avg.totalAmount || 0,
      byStatus: statusSummary,
    };
  }

  /**
   * Return items from a purchase invoice
   * Creates a reverse accounting transaction
   */
  async returnInvoice(returnDto: ReturnPurchaseInvoiceDto, userId?: string) {
    this.logger.log(
      `Processing return for purchase invoice ${returnDto.purchaseInvoiceId}`,
    );

    return this.prisma.$transaction(async (prisma) => {
      // 1. Get the original invoice with all details
      const originalInvoice = await prisma.purchaseInvoice.findUnique({
        where: { id: returnDto.purchaseInvoiceId, isDeleted: false },
        include: {
          supplier: { include: { account: true } },
          items: { include: { product: true } },
        },
      });

      if (!originalInvoice) {
        throw new NotFoundException('الفاتورة الأصلية غير موجودة');
      }

      // 2. Validate return items
      const totalReturnAmount = returnDto.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      // 3. Create return transaction (negative invoice)
      // Generate unique return invoice number with timestamp
      const timestamp = Date.now();
      const defaultReturnNumber = `RET-${originalInvoice.invoiceNumber}-${timestamp}`;

      const returnInvoice = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: returnDto.referenceNumber || defaultReturnNumber,
          supplierId: originalInvoice.supplierId,
          totalAmount: -totalReturnAmount, // Negative amount for return
          paidAmount: 0,
          remainingAmount: -totalReturnAmount,
          status: InvoiceStatus.PAID, // Returns are considered paid
          invoiceDate: new Date(),
          description: `إرجاع من فاتورة ${originalInvoice.invoiceNumber}${returnDto.returnReason ? ` - ${returnDto.returnReason}` : ''}`,
          invoiceConfigId: originalInvoice.invoiceConfigId, // Use same config as original invoice
          notes: returnDto.note,
          userId,
          // Mark as return invoice and link to original
          isReturn: true,
          originalInvoiceId: originalInvoice.id,
        },
      });

      // 4. Create reverse accounting transaction (only if original had a config)
      if (originalInvoice.invoiceConfigId) {
        const invoiceConfig = await this.invoiceConfigsService.findById(
          originalInvoice.invoiceConfigId,
        );

        if (invoiceConfig && invoiceConfig.isActive) {
          // Create reverse transaction (swap debit and credit)
          const transaction = await prisma.transaction.create({
            data: {
              date: new Date(),
              description: `إرجاع فاتورة شراء ${originalInvoice.invoiceNumber} - مبلغ ${totalReturnAmount}`,
              transactionType: 'GENERAL',
            },
          });

          // Original purchase invoice:
          // Debit: Inventory/Expense (debitAccountId)
          // Credit: Cash/Payables (creditAccountId)

          // Return should reverse this:
          // Debit: Cash/Payables (was credit, now debit)
          // Credit: Inventory/Expense (was debit, now credit)

          await prisma.transactionLine.createMany({
            data: [
              {
                transactionId: transaction.id,
                accountId: invoiceConfig.creditAccountId, // Cash/Payables - now DEBIT
                debit: totalReturnAmount,
                credit: 0,
                description: `استرداد مبلغ من المورد - ${originalInvoice.invoiceNumber}`,
                clientId: originalInvoice.supplierId,
              },
              {
                transactionId: transaction.id,
                accountId: invoiceConfig.debitAccountId, // Inventory/Expense - now CREDIT
                debit: 0,
                credit: totalReturnAmount,
                description: `إرجاع مشتريات - ${originalInvoice.invoiceNumber}`,
              },
            ],
          });

          this.logger.log(
            `Created reverse accounting transaction ${transaction.id} for return`,
          );
        }
      }

      // 5. Update stock for returned items (remove from warehouse)
      for (const returnItem of returnDto.items) {
        // Find original item
        const originalItem = originalInvoice.items.find(
          (i) => i.id === returnItem.originalPurchaseInvoiceItemId,
        );

        if (!originalItem) {
          throw new BadRequestException(
            `الصنف ${returnItem.productId} غير موجود في الفاتورة الأصلية`,
          );
        }

        // Validate quantity
        if (returnItem.quantity > Number(originalItem.quantity)) {
          throw new BadRequestException(
            `الكمية المرتجعة للصنف ${originalItem.product.name} تتجاوز الكمية الأصلية`,
          );
        }

        // Create return invoice item
        await prisma.purchaseInvoiceItem.create({
          data: {
            invoiceId: returnInvoice.id,
            productId: returnItem.productId,
            quantity: -returnItem.quantity, // Negative quantity for return
            unitPrice: returnItem.unitPrice,
            unitId: returnItem.unitId,
          },
        });

        // Update stock - remove items from tracking
        if (returnItem.trackingId) {
          const tracking = await prisma.tracking.findUnique({
            where: { id: returnItem.trackingId },
          });

          if (!tracking) {
            throw new BadRequestException(
              `التتبع ${returnItem.trackingId} غير موجود`,
            );
          }

          if (Number(tracking.quantity) < returnItem.quantity) {
            throw new BadRequestException(
              `الكمية المتوفرة في التتبع للصنف ${originalItem.product.name} غير كافية للإرجاع`,
            );
          }

          await prisma.tracking.update({
            where: { id: returnItem.trackingId },
            data: {
              quantity: { decrement: returnItem.quantity },
            },
          });
        }

        this.logger.log(
          `Removed ${returnItem.quantity} units of product ${returnItem.productId} from warehouse ${returnItem.fromWarehouseId}`,
        );
      }

      // 6. Update original invoice remaining amount
      await prisma.purchaseInvoice.update({
        where: { id: originalInvoice.id },
        data: {
          remainingAmount: { decrement: totalReturnAmount }, // Reduce debt to supplier
        },
      });

      this.logger.log(
        `Successfully processed return for invoice ${originalInvoice.invoiceNumber}, total amount: ${totalReturnAmount}`,
      );

      return {
        returnInvoice,
        originalInvoice,
        totalReturnAmount,
        message: 'تم إرجاع الأصناف بنجاح',
      };
    });
  }

  async getInvoicePayments(
    invoiceId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      purchaseInvoiceId: invoiceId,
      transactionType: 'PAYMENT',
    };

    const [payments, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          invoicePayments: {
            where: { isDeleted: false },
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          entries: {
            include: {
              account: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
