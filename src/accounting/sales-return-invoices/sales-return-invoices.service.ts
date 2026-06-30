import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, WarehouseTransactionType } from '@prisma/client';
import { UnitsService } from '../../inventory/units/units.service';
import { WarehouseTransactionsService } from '../../inventory/warehouse-transactions/warehouse-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceConfigsService } from '../invoice-configs/invoice-configs.service';
import {
  CreateSalesReturnInvoiceDto,
  UpdateSalesReturnInvoiceDto,
} from './dto';

@Injectable()
export class SalesReturnInvoicesService {
  private readonly logger = new Logger(SalesReturnInvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceConfigsService: InvoiceConfigsService,
    private unitsService: UnitsService,
    private warehouseTransactionsService: WarehouseTransactionsService,
  ) {}

  /**
   * Generate automatic return invoice number
   */
  private async generateReturnInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-SALE-${year}-`;

    const lastReturn = await this.prisma.salesReturnInvoice.findFirst({
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
  async getReturnableItems(salesInvoiceId: number) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: salesInvoiceId, isDeleted: false },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                salesUnit: true,
              },
            },
            unit: true,
          },
        },
        returnInvoicesNew: {
          where: { isDeleted: false },
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاتورة البيع غير موجودة');
    }

    // Calculate returned quantities for each item
    const returnedQuantities = new Map<number, number>();
    for (const returnInvoice of invoice.returnInvoicesNew) {
      for (const returnItem of returnInvoice.items) {
        const current =
          returnedQuantities.get(returnItem.originalSalesInvoiceItemId) || 0;
        returnedQuantities.set(
          returnItem.originalSalesInvoiceItemId,
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
  async recalculateOriginalInvoice(salesInvoiceId: number) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: salesInvoiceId, isDeleted: false },
      include: {
        returnInvoicesNew: {
          where: { isDeleted: false },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('فاتورة البيع غير موجودة');
    }

    // Calculate total returned amount
    const totalReturnedAmount = invoice.returnInvoicesNew.reduce(
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

  async create(createDto: CreateSalesReturnInvoiceDto, userId?: string) {
    const { salesInvoiceId, items, returnInvoiceNumber, payments, ...rest } =
      createDto;

    // Verify original invoice exists
    const originalInvoice = await this.prisma.salesInvoice.findUnique({
      where: { id: salesInvoiceId, isDeleted: false },
      include: {
        client: {
          include: { account: true },
        },
        items: true,
      },
    });

    if (!originalInvoice) {
      throw new NotFoundException('فاتورة البيع غير موجودة');
    }

    // Get returnable items to validate quantities
    const returnableData = await this.getReturnableItems(salesInvoiceId);
    const returnableMap = new Map(
      returnableData.items.map((item) => [item.id, item]),
    );

    // Validate return items
    for (const returnItem of items) {
      const returnable = returnableMap.get(
        returnItem.originalSalesInvoiceItemId,
      );
      if (!returnable) {
        throw new BadRequestException(
          `الصنف بالمعرف ${returnItem.originalSalesInvoiceItemId} غير موجود في الفاتورة`,
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
    }

    // Always generate return invoice number automatically
    let finalReturnInvoiceNumber =
      returnInvoiceNumber || (await this.generateReturnInvoiceNumber());

    // Check if return invoice number already exists
    let existingReturn = await this.prisma.salesReturnInvoice.findUnique({
      where: { returnInvoiceNumber: finalReturnInvoiceNumber },
    });

    // If somehow the number exists, keep generating until we find a unique one (max 10 attempts)
    let attempts = 0;
    while (existingReturn && attempts < 10) {
      finalReturnInvoiceNumber = await this.generateReturnInvoiceNumber();
      existingReturn = await this.prisma.salesReturnInvoice.findUnique({
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Create return invoice
      const returnInvoice = await tx.salesReturnInvoice.create({
        data: {
          returnInvoiceNumber: finalReturnInvoiceNumber,
          salesInvoiceId,
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
          salesInvoice: {
            include: {
              client: true,
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
          (i) => i.id === item.originalSalesInvoiceItemId,
        );
        if (!originalItem) continue;

        await tx.salesReturnInvoiceItem.create({
          data: {
            returnInvoiceId: returnInvoice.id,
            originalSalesInvoiceItemId: item.originalSalesInvoiceItemId,
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
      // For sales return: items come FROM customer (null) TO warehouse
      const warehouseTransaction = await tx.warehouseTransaction.create({
        data: {
          type: 'RETURN',
          fromWarehouseId: null, // Coming from customer
          toWarehouseId: items[0]?.toWarehouseId || null,
          totalPrice: netAmount,
          date: new Date(),
          note: `إرجاع فاتورة بيع - ${returnInvoice.returnInvoiceNumber}`,
          partyName: originalInvoice.client?.name || 'عميل غير محدد',
          referenceNumber: returnInvoice.returnInvoiceNumber,
          userId,
          salesInvoiceId: originalInvoice.id,
        },
      });

      // 4. Create warehouse transaction items and update inventory
      for (const item of items) {
        const originalItem = originalInvoice.items.find(
          (i) => i.id === item.originalSalesInvoiceItemId,
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
          item.unitId || product.salesUnitId || product.purchaseUnitId;
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
            originalSalesInvoiceItemId: item.originalSalesInvoiceItemId,
          },
        });

        // Update tracking quantity if specified
        // For sales return: increment stock (items are returned TO warehouse)
        if (item.trackingId) {
          await tx.tracking.update({
            where: { id: item.trackingId },
            data: {
              quantity: {
                increment: convertedQuantity, // Increment because items are returned TO warehouse
              },
            },
          });
        } else {
          // Find and update basic tracking
          const stock = await tx.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: item.toWarehouseId,
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
                    increment: convertedQuantity,
                  },
                },
              });
            } else {
              // Create new tracking if it doesn't exist
              await tx.tracking.create({
                data: {
                  stockId: stock.id,
                  trackingType: 'NONE',
                  quantity: convertedQuantity,
                  storageUnitId: storageUnitId || null,
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
          payments,
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
    payments?: Array<{ amount: number; paymentType: any; accountId: number }>,
  ) {
    try {
      // If payments are specified, use them to create detailed accounting entries
      if (payments && payments.length > 0) {
        this.logger.log(
          `Creating return accounting transaction with ${payments.length} payment method(s)`,
        );

        // Validate that payment amounts sum to return amount
        const totalPaymentAmount = payments.reduce(
          (sum, p) => sum + p.amount,
          0,
        );
        if (Math.abs(totalPaymentAmount - returnAmount) > 0.01) {
          throw new Error(
            `مجموع المبالغ المستردة (${totalPaymentAmount}) لا يساوي مبلغ الإرجاع (${returnAmount})`,
          );
        }

        // Validate all accounts exist
        for (const payment of payments) {
          const account = await tx.account.findUnique({
            where: { id: payment.accountId },
          });
          if (!account) {
            throw new Error(`الحساب بالمعرف ${payment.accountId} غير موجود`);
          }
        }

        // Get the sales revenue account from the original invoice config
        let revenueAccountId: number | null = null;
        if (originalInvoice.invoiceConfigId) {
          const config = await this.invoiceConfigsService.findById(
            originalInvoice.invoiceConfigId,
          );
          if (config && config.isActive) {
            // In sales invoice: debit is cash/receivables, credit is revenue
            revenueAccountId = config.creditAccountId;
          }
        }

        // If no revenue account found from config, we need to find a default revenue account
        if (!revenueAccountId) {
          // Try to find a sales revenue account
          const revenueAccount = await tx.account.findFirst({
            where: {
              type: 'REVENUE',
              isDeleted: false,
            },
          });
          if (revenueAccount) {
            revenueAccountId = revenueAccount.id;
          } else {
            this.logger.warn(
              'No revenue account found, skipping accounting transaction',
            );
            return null;
          }
        }

        // Create main transaction
        const transaction = await tx.transaction.create({
          data: {
            date: new Date(),
            description: `إرجاع فاتورة بيع - ${returnInvoice.returnInvoiceNumber} (${payments.length} طريقة دفع)`,
            transactionType: 'INVOICE',
            salesReturnInvoiceId: returnInvoice.id,
            salesInvoiceId: originalInvoice.id,
            clientId: originalInvoice.clientId,
            userId,
          },
        });

        // Debit the revenue account (reduce revenue) - this is the SAME for all payment methods
        await tx.transactionLine.create({
          data: {
            debit: returnAmount,
            credit: 0,
            accountId: revenueAccountId,
            transactionId: transaction.id,
            clientId: originalInvoice.clientId,
            description: `تقليل الإيرادات - إرجاع فاتورة ${returnInvoice.returnInvoiceNumber}`,
          },
        });

        // Credit each payment account (return money to customer)
        for (const payment of payments) {
          await tx.transactionLine.create({
            data: {
              debit: 0,
              credit: payment.amount,
              accountId: payment.accountId,
              transactionId: transaction.id,
              clientId: originalInvoice.clientId,
              description: `استرداد مبلغ ${payment.paymentType} - ${returnInvoice.returnInvoiceNumber}`,
            },
          });
        }

        this.logger.log(
          `Created detailed accounting transaction ${transaction.id} for return with payments`,
        );
        return transaction;
      }

      // Fall back to original logic if no payments specified
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

      // For sales return, we need to reverse the original transaction:
      // Original: Dr. Cash/Accounts Receivable, Cr. Sales (Revenue)
      // Return: Dr. Sales (Revenue), Cr. Cash/Accounts Receivable

      const transaction = await tx.transaction.create({
        data: {
          date: new Date(),
          description: `إرجاع فاتورة بيع - ${returnInvoice.returnInvoiceNumber}`,
          transactionType: 'INVOICE',
          salesReturnInvoiceId: returnInvoice.id,
          salesInvoiceId: originalInvoice.id,
          clientId: originalInvoice.clientId,
          userId,
        },
      });

      // Create transaction lines (reversed from original)
      await tx.transactionLine.create({
        data: {
          debit: returnAmount,
          credit: 0,
          accountId: config.creditAccountId, // What was credited in original (Sales Revenue)
          transactionId: transaction.id,
          clientId: originalInvoice.clientId,
          description: `إرجاع فاتورة بيع - ${returnInvoice.returnInvoiceNumber} - مدين`,
        },
      });

      await tx.transactionLine.create({
        data: {
          debit: 0,
          credit: returnAmount,
          accountId: config.debitAccountId, // What was debited in original (Cash/Receivables)
          transactionId: transaction.id,
          clientId: originalInvoice.clientId,
          description: `إرجاع فاتورة بيع - ${returnInvoice.returnInvoiceNumber} - دائن`,
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
      salesInvoiceId,
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

    if (salesInvoiceId) {
      where.salesInvoiceId = parseInt(salesInvoiceId);
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
          salesInvoice: {
            invoiceNumber: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [returnInvoices, totalCount] = await Promise.all([
      this.prisma.salesReturnInvoice.findMany({
        where,
        include: {
          salesInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              client: {
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
              originalSalesInvoiceItem: {
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
      this.prisma.salesReturnInvoice.count({ where }),
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
    const returnInvoice = await this.prisma.salesReturnInvoice.findUnique({
      where: { id, isDeleted: false },
      include: {
        salesInvoice: {
          include: {
            client: {
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
            originalSalesInvoiceItem: {
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
        `فاتورة إرجاع البيع مع المعرف ${id} غير موجودة`,
      );
    }

    return returnInvoice;
  }

  async update(id: number, updateDto: UpdateSalesReturnInvoiceDto) {
    // const existingReturn = await this.findOne(id);

    return this.prisma.salesReturnInvoice.update({
      where: { id },
      data: {
        ...updateDto,
        returnDate: updateDto.returnDate
          ? new Date(updateDto.returnDate)
          : undefined,
      },
      include: {
        salesInvoice: true,
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
    const transactionCount = await this.prisma.transaction.count({
      where: {
        isDeleted: false,
        salesReturnInvoiceId: id,
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف فاتورة إرجاع مرتبطة بمعاملات محاسبية',
      );
    }

    // Get warehouse transactions related to this return invoice
    const warehouseTransactions =
      await this.prisma.warehouseTransaction.findMany({
        where: {
          type: WarehouseTransactionType.RETURN,
          salesInvoiceId: returnInvoice.salesInvoiceId,
          // We need to find the specific return transaction - check by reference number
          referenceNumber: returnInvoice.returnInvoiceNumber,
        },
        include: {
          items: true,
        },
      });

    // Delete warehouse transactions and reverse their stock effects
    // For sales return: when created, stock was increased, so on deletion we need to decrease
    for (const warehouseTransaction of warehouseTransactions) {
      await this.warehouseTransactionsService.remove(warehouseTransaction.id);
    }

    // Soft delete the return invoice
    await this.prisma.$transaction(async (tx) => {
      // Delete return invoice items
      await tx.salesReturnInvoiceItem.deleteMany({
        where: { returnInvoiceId: id },
      });

      // Soft delete the return invoice
      await tx.salesReturnInvoice.update({
        where: { id },
        data: { isDeleted: true },
      });
    });

    return { message: 'تم حذف فاتورة إرجاع البيع بنجاح' };
  }
}
