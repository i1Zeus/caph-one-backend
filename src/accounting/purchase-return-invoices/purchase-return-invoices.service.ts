import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePurchaseReturnInvoiceDto,
  UpdatePurchaseReturnInvoiceDto,
} from './dto';
import { InvoiceStatus, WarehouseTransactionType } from '@prisma/client';
import { InvoiceConfigsService } from '../invoice-configs/invoice-configs.service';
import {
  InvoiceType,
  PaymentType as ConfigPaymentType,
} from '../invoice-configs/dto';
import { UnitsService } from '../../inventory/units/units.service';
import { WarehouseTransactionsService } from '../../inventory/warehouse-transactions/warehouse-transactions.service';

@Injectable()
export class PurchaseReturnInvoicesService {
  private readonly logger = new Logger(PurchaseReturnInvoicesService.name);

  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private invoiceConfigsService: InvoiceConfigsService,
    private unitsService: UnitsService,
    private warehouseTransactionsService: WarehouseTransactionsService,
  ) {}

  /**
   * Generate automatic return invoice number
   */
  private async generateReturnInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-PUR-${year}-`;

    const lastReturn = await this.tenantPrisma.client.purchaseReturnInvoice.findFirst({
      where: {
        returnInvoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        returnInvoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastReturn) {
      const lastNumberStr = lastReturn.returnInvoiceNumber.split('-').pop();
      const lastNumber = parseInt(lastNumberStr || '0', 10);
      nextNumber = lastNumber + 1;
    }

    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Get returnable items from original invoice
   */
  async getReturnableItems(purchaseInvoiceId: number) {
    const invoice = await this.tenantPrisma.client.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId, isDeleted: false },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                purchaseUnit: true,
              },
            },
            unit: true,
          },
        },
        returnInvoicesNew: {
          where: { isDeleted: false },
          include: {
            items: {
              select: {
                id: true,
                originalPurchaseInvoiceItemId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاتورة الشراء غير موجودة');
    }

    // Calculate returned quantities for each item
    const returnedQuantities = new Map<number, number>();
    for (const returnInvoice of invoice.returnInvoicesNew) {
      for (const returnItem of returnInvoice.items) {
        const current =
          returnedQuantities.get(returnItem.originalPurchaseInvoiceItemId) || 0;
        returnedQuantities.set(
          returnItem.originalPurchaseInvoiceItemId,
          current + Number(returnItem.quantity),
        );
      }
    }

    // Calculate returnable quantities
    const returnableItems = invoice.items.map((item) => {
      const totalReturned = returnedQuantities.get(item.id) || 0;
      const returnableQuantity = Math.max(
        0,
        Number(item.quantity) - totalReturned,
      );

      return {
        id: item.id,
        productId: item.productId,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalReturnedQuantity: totalReturned,
        returnableQuantity,
        canReturn: returnableQuantity > 0,
        product: item.product,
        unit: item.unit,
      };
    });

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        netAmount: invoice.totalAmount, // Use totalAmount as netAmount in devhouse structure
      },
      items: returnableItems,
    };
  }

  /**
   * Recalculate original invoice amounts based on returns
   */
  async recalculateOriginalInvoice(purchaseInvoiceId: number) {
    const invoice = await this.tenantPrisma.client.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId, isDeleted: false },
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
      originalNetAmount,
      totalReturnedAmount,
      effectiveNetAmount,
      effectivePaidAmount,
      effectiveRemainingAmount,
      effectiveStatus,
      returnCount: invoice.returnInvoicesNew.length,
    };
  }

  async create(createDto: CreatePurchaseReturnInvoiceDto, userId?: string) {
    const { purchaseInvoiceId, items, returnInvoiceNumber, ...rest } =
      createDto;

    // Verify original invoice exists
    const originalInvoice = await this.tenantPrisma.client.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId, isDeleted: false },
      include: {
        supplier: {
          include: { account: true },
        },
        items: true,
      },
    });

    if (!originalInvoice) {
      throw new NotFoundException('فاتورة الشراء غير موجودة');
    }

    // Get the warehouse transaction for this purchase invoice to find the destination warehouse
    const purchaseWarehouseTransaction =
      await this.tenantPrisma.client.warehouseTransaction.findFirst({
        where: {
          purchaseInvoiceId: purchaseInvoiceId,
          type: 'PURCHASE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (
      !purchaseWarehouseTransaction ||
      !purchaseWarehouseTransaction.toWarehouseId
    ) {
      throw new BadRequestException(
        'لا يمكن تحديد المخزن الأصلي للفاتورة. يرجى التحقق من فاتورة الشراء.',
      );
    }
    const sourceWarehouseId = purchaseWarehouseTransaction.toWarehouseId;

    // Get returnable items to validate quantities
    const returnableData = await this.getReturnableItems(purchaseInvoiceId);
    const returnableMap = new Map(
      returnableData.items.map((item) => [item.id, item]),
    );

    // Validate return items
    for (const returnItem of items) {
      const returnable = returnableMap.get(
        returnItem.originalPurchaseInvoiceItemId,
      ) as any;
      if (!returnable) {
        throw new BadRequestException(
          `الصنف بالمعرف ${returnItem.originalPurchaseInvoiceItemId} غير موجود في الفاتورة`,
        );
      }
      if (!returnable.canReturn) {
        throw new BadRequestException(
          `لا يمكن إرجاع الصنف ${returnable.product.name} - تم إرجاعه بالكامل`,
        );
      }
      if (returnItem.quantity > returnable.returnableQuantity) {
        throw new BadRequestException(
          `الكمية المطلوب إرجاعها للصنف ${returnable.product.name} تتجاوز الكمية المتاحة للإرجاع`,
        );
      }
      // Override fromWarehouseId with the source warehouse from purchase invoice
      returnItem.fromWarehouseId = sourceWarehouseId;
    }

    // Always generate return invoice number automatically
    let finalReturnInvoiceNumber =
      returnInvoiceNumber || (await this.generateReturnInvoiceNumber());

    // Check if return invoice number already exists
    let existingReturn = await this.tenantPrisma.client.purchaseReturnInvoice.findUnique({
      where: { returnInvoiceNumber: finalReturnInvoiceNumber },
    });

    // If somehow the number exists, keep generating until we find a unique one (max 10 attempts)
    let attempts = 0;
    while (existingReturn && attempts < 10) {
      finalReturnInvoiceNumber = await this.generateReturnInvoiceNumber();
      existingReturn = await this.tenantPrisma.client.purchaseReturnInvoice.findUnique({
        where: { returnInvoiceNumber: finalReturnInvoiceNumber },
      });
      attempts++;
    }

    if (existingReturn) {
      throw new BadRequestException(
        'خطأ في توليد رقم فاتورة الإرجاع. يرجى المحاولة مرة أخرى',
      );
    }

    // Calculate total return amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const netAmount = totalAmount; // No discount on returns for now

    return this.tenantPrisma.client.$transaction(async (tx) => {
      // 1. Create return invoice
      const returnInvoice = await tx.purchaseReturnInvoice.create({
        data: {
          returnInvoiceNumber: finalReturnInvoiceNumber,
          purchaseInvoiceId,
          totalAmount,
          netAmount,
          status: InvoiceStatus.PAID,
          notes: rest.notes,
          returnReason: rest.returnReason,
          referenceInvoiceNumber: rest.referenceInvoiceNumber,
          returnDate: rest.returnDate ? new Date(rest.returnDate) : new Date(),
          userId,
          currencyId: rest.currencyId || originalInvoice.currencyId || null,
          departmentId: rest.departmentId || null,
        },
        include: {
          purchaseInvoice: {
            include: {
              supplier: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 2. Create return invoice items
      for (const item of items) {
        const originalItem = originalInvoice.items.find(
          (i) => i.id === item.originalPurchaseInvoiceItemId,
        );
        if (!originalItem) continue;

        await tx.purchaseReturnInvoiceItem.create({
          data: {
            returnInvoiceId: returnInvoice.id,
            originalPurchaseInvoiceItemId: item.originalPurchaseInvoiceItemId,
            productId: item.productId,
            unitId: item.unitId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            trackingId: item.trackingId || null,
            notes: item.notes || null,
          },
        });
      }

      // 3. Create warehouse transaction for inventory movement
      const warehouseTransaction = await tx.warehouseTransaction.create({
        data: {
          type: 'RETURN',
          fromWarehouseId: sourceWarehouseId, // Warehouse items are being returned from
          toWarehouseId: null, // Returning to supplier
          totalPrice: netAmount,
          date: new Date(),
          note: `إرجاع فاتورة شراء - ${returnInvoice.returnInvoiceNumber}`,
          partyName: originalInvoice.supplier?.name || 'مورد غير محدد',
          referenceNumber: returnInvoice.returnInvoiceNumber,
          userId,
          purchaseInvoiceId: originalInvoice.id,
        },
      });

      // 4. Create warehouse transaction items and update inventory
      for (const item of items) {
        const originalItem = originalInvoice.items.find(
          (i) => i.id === item.originalPurchaseInvoiceItemId,
        );
        if (!originalItem) continue;

        // Get product details for unit conversion
        const product = await tx.product.findUnique({
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

        let storageUnitId =
          item.unitId || product.purchaseUnitId || product.salesUnitId;
        let convertedQuantity = item.quantity;

        // Convert units if needed
        if (item.unitId && storageUnitId && item.unitId !== storageUnitId) {
          try {
            const conversionResult = await this.unitsService.convertQuantity(
              item.quantity,
              item.unitId,
              storageUnitId,
            );
            convertedQuantity = conversionResult.convertedQuantity;
          } catch (error) {
            this.logger.error('Unit conversion failed:', error);
            storageUnitId = item.unitId;
            convertedQuantity = item.quantity;
          }
        }

        await tx.warehouseTransactionItem.create({
          data: {
            transactionId: warehouseTransaction.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            unitId: item.unitId || null,
            trackingId: item.trackingId || null,
            itemNote: `إرجاع من فاتورة ${returnInvoice.returnInvoiceNumber}`,
            originalPurchaseInvoiceItemId: item.originalPurchaseInvoiceItemId,
          },
        });

        // Update tracking quantity if specified
        if (item.trackingId) {
          await tx.tracking.update({
            where: { id: item.trackingId },
            data: {
              quantity: {
                decrement: convertedQuantity, // Decrement because we're returning to supplier
              },
            },
          });
        } else {
          // Find and update basic tracking
          const stock = await tx.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: sourceWarehouseId,
              },
            },
          });

          if (stock) {
            const existingTracking = await tx.tracking.findFirst({
              where: {
                stockId: stock.id,
                trackingType: 'NONE',
              },
            });

            if (existingTracking) {
              await tx.tracking.update({
                where: { id: existingTracking.id },
                data: {
                  quantity: {
                    decrement: convertedQuantity,
                  },
                },
              });
            }
          }
        }
      }

      // 5. Create reverse accounting transaction
      try {
        await this.createReturnAccountingTransaction(
          tx,
          originalInvoice,
          returnInvoice,
          netAmount,
          userId,
        );
      } catch (error) {
        this.logger.error(
          'Failed to create accounting transaction for return:',
          error,
        );
        // Continue without failing the entire operation
      }

      return returnInvoice;
    });
  }

  private async createReturnAccountingTransaction(
    tx: any,
    originalInvoice: any,
    returnInvoice: any,
    returnAmount: number,
    userId?: string,
  ) {
    try {
      // Get the invoice configuration to understand original transaction structure
      // Check if original invoice has invoiceConfigId
      if (!originalInvoice.invoiceConfigId) {
        this.logger.warn(
          'Original invoice has no invoiceConfigId, skipping accounting transaction',
        );
        return null;
      }

      const config = await this.invoiceConfigsService.findById(
        originalInvoice.invoiceConfigId,
      );

      if (!config || !config.isActive) {
        this.logger.warn(
          'Invoice config not found or inactive, skipping accounting transaction',
        );
        return null;
      }

      // For purchase return, we need to reverse the original transaction:
      // Original: Dr. Purchases (Expense), Cr. Cash/Accounts Payable
      // Return: Dr. Cash/Accounts Payable, Cr. Purchases (Expense)

      const transaction = await tx.transaction.create({
        data: {
          date: new Date(),
          description: `إرجاع فاتورة شراء - ${returnInvoice.returnInvoiceNumber}`,
          transactionType: 'INVOICE',
          purchaseReturnInvoiceId: returnInvoice.id,
          purchaseInvoiceId: originalInvoice.id,
          clientId: originalInvoice.supplierId,
          userId,
        },
      });

      // Create transaction lines (reversed from original)
      await tx.transactionLine.create({
        data: {
          debit: returnAmount,
          credit: 0,
          accountId: config.creditAccountId, // What was credited in original (Cash/Payable)
          transactionId: transaction.id,
          clientId: originalInvoice.supplierId,
          description: `إرجاع فاتورة شراء - ${returnInvoice.returnInvoiceNumber} - مدين`,
        },
      });

      await tx.transactionLine.create({
        data: {
          debit: 0,
          credit: returnAmount,
          accountId: config.debitAccountId, // What was debited in original (Purchases)
          transactionId: transaction.id,
          clientId: originalInvoice.supplierId,
          description: `إرجاع فاتورة شراء - ${returnInvoice.returnInvoiceNumber} - دائن`,
        },
      });

      return transaction;
    } catch (error) {
      this.logger.error('Error creating return accounting transaction:', error);
      throw error;
    }
  }

  async findAll(
    filters: any = {},
    userId?: string,
    departmentId?: string | null,
    isInventoryAdmin?: boolean,
  ) {
    const {
      purchaseInvoiceId,
      departmentId: queryDepartmentId,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = filters;

    // Convert page and limit to numbers
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

    const where: any = {
      isDeleted: false,
    };

    if (purchaseInvoiceId) {
      where.purchaseInvoiceId = parseInt(purchaseInvoiceId);
    }

    // Auto-filter by department for non-admin users
    let effectiveDepartmentId = queryDepartmentId
      ? String(queryDepartmentId)
      : undefined;
    if (userId && !isInventoryAdmin) {
      if (departmentId) {
        effectiveDepartmentId = departmentId;
      } else {
        // User has no department assigned, return empty results
        return {
          returnInvoices: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount: 0,
            totalPages: 0,
          },
        };
      }
    }

    if (effectiveDepartmentId) {
      where.departmentId = effectiveDepartmentId;
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
      where.returnDate = {};
      if (startDate) {
        where.returnDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.returnDate.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { returnInvoiceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { returnReason: { contains: search, mode: 'insensitive' } },
        { referenceInvoiceNumber: { contains: search, mode: 'insensitive' } },
        {
          purchaseInvoice: {
            invoiceNumber: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [returnInvoices, totalCount] = await Promise.all([
      this.tenantPrisma.client.purchaseReturnInvoice.findMany({
        where,
        include: {
          purchaseInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
              unit: true,
              originalPurchaseInvoiceItem: {
                include: {
                  product: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.tenantPrisma.client.purchaseReturnInvoice.count({ where }),
    ]);

    return {
      returnInvoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    };
  }

  async findOne(id: number) {
    const returnInvoice = await this.tenantPrisma.client.purchaseReturnInvoice.findUnique({
      where: { id, isDeleted: false },
      include: {
        purchaseInvoice: {
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
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
              },
            },
            unit: true,
            originalPurchaseInvoiceItem: {
              include: {
                product: true,
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
      },
    });

    if (!returnInvoice) {
      throw new NotFoundException(
        `فاتورة إرجاع الشراء مع المعرف ${id} غير موجودة`,
      );
    }

    return returnInvoice;
  }

  async update(id: number, updateDto: UpdatePurchaseReturnInvoiceDto) {
    // const existingReturn = await this.findOne(id);

    return this.tenantPrisma.client.purchaseReturnInvoice.update({
      where: { id },
      data: {
        ...updateDto,
        returnDate: updateDto.returnDate
          ? new Date(updateDto.returnDate)
          : undefined,
      },
      include: {
        purchaseInvoice: true,
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
    const returnInvoice = await this.findOne(id);

    // Check if there are related accounting transactions
    const transactionCount = await this.tenantPrisma.client.transaction.count({
      where: {
        isDeleted: false,
        purchaseReturnInvoiceId: id,
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف فاتورة إرجاع مرتبطة بمعاملات محاسبية',
      );
    }

    // Get warehouse transactions related to this return invoice
    const warehouseTransactions =
      await this.tenantPrisma.client.warehouseTransaction.findMany({
        where: {
          type: WarehouseTransactionType.RETURN,
          purchaseInvoiceId: returnInvoice.purchaseInvoiceId,
          // We need to find the specific return transaction - check by reference number
          referenceNumber: returnInvoice.returnInvoiceNumber,
        },
        include: {
          items: true,
        },
      });

    // Delete warehouse transactions and reverse their stock effects
    // For purchase return: when created, stock was decreased, so on deletion we need to increase
    for (const warehouseTransaction of warehouseTransactions) {
      await this.warehouseTransactionsService.remove(warehouseTransaction.id);
    }

    // Soft delete the return invoice
    await this.tenantPrisma.client.$transaction(async (tx) => {
      // Delete return invoice items
      await tx.purchaseReturnInvoiceItem.deleteMany({
        where: { returnInvoiceId: id },
      });

      // Soft delete the return invoice
      await tx.purchaseReturnInvoice.update({
        where: { id },
        data: { isDeleted: true },
      });
    });

    return { message: 'تم حذف فاتورة إرجاع الشراء بنجاح' };
  }
}
