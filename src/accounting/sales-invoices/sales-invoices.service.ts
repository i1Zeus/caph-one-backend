import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { UnitsService } from '../../inventory/units/units.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceType } from '../invoice-configs/dto';
import { InvoiceConfigsService } from '../invoice-configs/invoice-configs.service';
import {
  CreateSalesInvoiceDto,
  ReturnSalesInvoiceDto,
  UpdateSalesInvoiceDto,
} from './dto';

@Injectable()
export class SalesInvoicesService {
  private readonly logger = new Logger(SalesInvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceConfigsService: InvoiceConfigsService,
    private unitsService: UnitsService,
  ) {}

  /**
   * Generate automatic invoice number in format: SAL-YYYY-####
   * Example: SAL-2025-0001, SAL-2025-0002
   */
  private async generateInvoiceNumber(
    prisma?: any,
    startFromNumber?: number,
  ): Promise<string> {
    const prismaClient = prisma || this.prisma;
    const currentYear = new Date().getFullYear();
    const prefix = 'SAL';

    let nextNumber = startFromNumber || 1;

    // If no starting number provided, find the highest existing invoice number
    if (!startFromNumber) {
      // Get all invoices with the current year pattern (excluding POS invoices and deleted)
      // Use a more efficient query - get the last invoice ordered by invoiceNumber
      const lastInvoice = await prismaClient.salesInvoice.findFirst({
        where: {
          invoiceNumber: {
            startsWith: `${prefix}-${currentYear}-`,
          },
          isPOS: false, // Exclude POS invoices from regular numbering
          isDeleted: false,
        },
        select: {
          invoiceNumber: true,
        },
        orderBy: {
          id: 'desc', // Order by ID instead of invoiceNumber for better performance
        },
      });

      // Also query for any invoices that might have higher numbers (to catch gaps)
      // Get a sample of invoices to find the maximum
      const sampleInvoices = await prismaClient.salesInvoice.findMany({
        where: {
          invoiceNumber: {
            startsWith: `${prefix}-${currentYear}-`,
          },
          isPOS: false,
          isDeleted: false,
        },
        select: {
          invoiceNumber: true,
        },
        take: 1000, // Increased limit to catch more cases
      });

      // Find the highest number from all invoices
      let maxNumber = 0;

      // Check the last invoice first
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const parts = lastInvoice.invoiceNumber.split('-');
        if (parts.length === 3) {
          const number = parseInt(parts[2], 10);
          if (!isNaN(number)) {
            maxNumber = number;
          }
        }
      }

      // Check all sample invoices to find the absolute maximum
      for (const invoice of sampleInvoices) {
        const parts = invoice.invoiceNumber.split('-');
        if (parts.length === 3) {
          const number = parseInt(parts[2], 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      }

      nextNumber = maxNumber + 1;
    }

    // Format as 4-digit number with leading zeros
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}-${currentYear}-${formattedNumber}`;
  }

  /**
   * Generate automatic POS invoice number in format: {slug}-{sessionNumber}-{orderNumber}
   * Example: cashier-on-001-0001, main-pos-002-0001
   */
  private async generatePOSInvoiceNumber(
    posSessionId: number,
    prisma?: any,
  ): Promise<string> {
    const prismaClient = prisma || this.prisma;
    // Fetch POS session with POS details
    const session = await prismaClient.pOSSession.findUnique({
      where: { id: posSessionId },
      include: {
        pos: true,
      },
    });

    if (!session) {
      throw new BadRequestException('POS session not found');
    }

    if (!session.pos.slug) {
      throw new BadRequestException('POS terminal slug is missing');
    }

    // Ensure sessionNumber is set (for legacy sessions, generate it dynamically)
    let sessionNumber = session.sessionNumber;
    if (!sessionNumber) {
      // For existing sessions without sessionNumber, generate it based on session order
      const sessionOrder = await prismaClient.pOSSession.count({
        where: {
          posId: session.posId,
          isDeleted: false,
          id: { lte: session.id }, // Count sessions up to and including this one
        },
      });
      sessionNumber = sessionOrder.toString().padStart(3, '0');

      // Update the session with the generated sessionNumber for future use
      await prismaClient.pOSSession.update({
        where: { id: session.id },
        data: { sessionNumber },
      });
    }

    // Count existing invoices for this specific session to get the next order number
    const invoiceCount = await prismaClient.salesInvoice.count({
      where: {
        posSessionId: posSessionId,
        isPOS: true,
        isDeleted: false,
      },
    });

    const orderNumber = (invoiceCount + 1).toString().padStart(4, '0');

    // Format: {slug}-{sessionNumber}-{orderNumber}
    return `${session.pos.slug}-${sessionNumber}-${orderNumber}`;
  }

  async create(createSalesInvoiceDto: CreateSalesInvoiceDto, userId?: string) {
    const {
      clientId,
      totalAmount,
      paidAmount = 0,
      currencyId,
      items,
      warehouseId,
      discount = 0,
      discountType = 'FIXED',
      // ...rest
    } = createSalesInvoiceDto;

    // Verify that the client exists (if provided)
    let client = null;
    if (clientId) {
      client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: { account: true },
      });

      if (!client) {
        throw new NotFoundException('العميل غير موجود');
      }
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

      // Validate products and stock
      for (const item of items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId, isDeleted: false },
        });

        if (!product) {
          throw new NotFoundException(
            `المنتج بالمعرف ${item.productId} غير موجود`,
          );
        }

        // Check stock availability if tracking is specified
        if (item.trackingId) {
          const tracking = await this.prisma.tracking.findUnique({
            where: { id: item.trackingId, isDeleted: false },
          });

          if (!tracking) {
            throw new NotFoundException(
              `التتبع بالمعرف ${item.trackingId} غير موجود`,
            );
          }

          if (Number(tracking.quantity) < item.quantity) {
            throw new BadRequestException(
              `الكمية المطلوبة ${item.quantity} أكبر من المتاح ${tracking.quantity} للمنتج ${product.name}`,
            );
          }
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
    const providedInvoiceNumber = createSalesInvoiceDto.invoiceNumber;

    if (providedInvoiceNumber) {
      // Check if provided invoice number already exists
      const existingInvoice = await this.prisma.salesInvoice.findUnique({
        where: { invoiceNumber: providedInvoiceNumber },
      });

      if (existingInvoice) {
        throw new BadRequestException('رقم الفاتورة موجود مسبقاً');
      }
    }

    // Validate POS session if this is a POS invoice
    if (createSalesInvoiceDto.isPOS && !createSalesInvoiceDto.posSessionId) {
      throw new BadRequestException(
        'POS session ID is required for POS invoices',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Generate invoice number inside transaction to prevent race conditions
      let invoiceNumber = providedInvoiceNumber;

      if (!invoiceNumber) {
        // Auto-generate invoice number based on invoice type (POS or regular)
        // Use transaction client to ensure consistency
        // Keep generating until we find a unique one
        let attempts = 0;
        const maxAttempts = 100;
        let foundUnique = false;
        let currentNumber = 1;

        while (!foundUnique && attempts < maxAttempts) {
          attempts++;

          // Generate invoice number
          if (createSalesInvoiceDto.isPOS) {
            invoiceNumber = await this.generatePOSInvoiceNumber(
              createSalesInvoiceDto.posSessionId,
              prisma,
            );
          } else {
            invoiceNumber = await this.generateInvoiceNumber(
              prisma,
              currentNumber,
            );
          }

          // Check if it already exists
          const existingInvoice = await prisma.salesInvoice.findUnique({
            where: { invoiceNumber },
          });

          if (!existingInvoice) {
            foundUnique = true;
          } else {
            // If it exists, increment and try again
            if (!createSalesInvoiceDto.isPOS) {
              // Extract number and increment
              const parts = invoiceNumber.split('-');
              if (parts.length === 3) {
                const num = parseInt(parts[2], 10);
                if (!isNaN(num)) {
                  currentNumber = num + 1;
                } else {
                  currentNumber++;
                }
              } else {
                currentNumber++;
              }
            }
            // For POS invoices, regenerate will happen in next iteration
          }
        }

        if (!foundUnique) {
          throw new BadRequestException(
            `Unable to generate unique invoice number after ${maxAttempts} attempts`,
          );
        }
      } else {
        // If invoice number is provided, verify it doesn't already exist
        const existingInvoice = await prisma.salesInvoice.findUnique({
          where: { invoiceNumber },
        });

        if (existingInvoice) {
          throw new BadRequestException(
            `Invoice number ${invoiceNumber} already exists`,
          );
        }
      }

      // 2. Create the sales invoice
      const invoiceData: any = {
        invoiceNumber,
        totalAmount: new Decimal(finalTotalAmount),
        paidAmount: new Decimal(paidAmount),
        remainingAmount: new Decimal(remainingAmount),
        subtotalBeforeDiscount: subtotalBeforeDiscount
          ? new Decimal(subtotalBeforeDiscount)
          : null,
        status,
        discount: discount ? new Decimal(discount) : null,
        discountType,
        invoiceDate: createSalesInvoiceDto.invoiceDate
          ? new Date(createSalesInvoiceDto.invoiceDate)
          : new Date(),
        dueDate: createSalesInvoiceDto.dueDate
          ? new Date(createSalesInvoiceDto.dueDate)
          : undefined,
        // POS-specific fields
        isPOS: createSalesInvoiceDto.isPOS || false,
        // Return fields
        isReturn: createSalesInvoiceDto.isReturn || false,
        // Other fields
        description: createSalesInvoiceDto.description || null,
        notes: createSalesInvoiceDto.notes || null,
        paymentType: createSalesInvoiceDto.paymentType || 'CREDIT',
      };

      // Conditionally add optional foreign key fields
      if (clientId) {
        invoiceData.clientId = clientId;
      }
      if (userId) {
        invoiceData.userId = userId;
      }
      if (currencyId) {
        invoiceData.currencyId = currencyId;
      }
      if (createSalesInvoiceDto.posSessionId) {
        invoiceData.posSessionId = createSalesInvoiceDto.posSessionId;
      }
      if (createSalesInvoiceDto.cashierId) {
        invoiceData.cashierId = createSalesInvoiceDto.cashierId;
      }
      if (createSalesInvoiceDto.originalInvoiceId) {
        invoiceData.originalInvoiceId = createSalesInvoiceDto.originalInvoiceId;
      }
      if (createSalesInvoiceDto.invoiceConfigId) {
        invoiceData.invoiceConfigId = createSalesInvoiceDto.invoiceConfigId;
      }
      // Add printFormat only if provided, otherwise Prisma will use the default (RECEIPT)
      if (createSalesInvoiceDto.printFormat) {
        invoiceData.printFormat = createSalesInvoiceDto.printFormat;
      }

      // Create the invoice (we've already verified the invoice number is unique)
      const invoice = await prisma.salesInvoice.create({
        data: invoiceData,
        include: {
          client: true,
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
          await prisma.salesInvoiceItem.create({
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
        // For returns, use RETURN type and add items back to warehouse
        const isReturn = createSalesInvoiceDto.isReturn || false;
        const warehouseTransaction = await prisma.warehouseTransaction.create({
          data: {
            type: isReturn ? 'RETURN' : 'SALE',
            fromWarehouseId: isReturn ? null : warehouseId, // For returns, items come back to warehouse (no from)
            toWarehouseId: isReturn ? warehouseId : null, // For returns, items go back to warehouse
            totalPrice: finalTotalAmount, // Will be negative for returns
            date: new Date(),
            note: isReturn
              ? `إرجاع فاتورة ${createSalesInvoiceDto.originalInvoiceId || ''} - ${invoice.invoiceNumber}`
              : `فاتورة بيع رقم ${invoice.invoiceNumber}`,
            partyName: client?.name || 'عميل غير محدد',
            referenceNumber: invoice.invoiceNumber,
            userId: userId,
            salesInvoiceId: invoice.id,
          },
        });

        // 5. Create warehouse transaction items and update stock with unit conversion
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

          // Get the tracking to determine its storage unit
          let trackingStorageUnitId = null;
          let convertedQuantity = item.quantity;

          if (item.trackingId) {
            const tracking = await prisma.tracking.findUnique({
              where: { id: item.trackingId },
              include: {
                storageUnit: true,
              },
            });

            if (!tracking) {
              throw new NotFoundException(
                `التتبع بالمعرف ${item.trackingId} غير موجود`,
              );
            }

            trackingStorageUnitId = tracking.storageUnitId;

            // If user provided a different unit than the tracking's storage unit, convert it
            if (
              item.unitId &&
              trackingStorageUnitId &&
              item.unitId !== trackingStorageUnitId
            ) {
              try {
                const conversionResult =
                  await this.unitsService.convertQuantity(
                    item.quantity,
                    item.unitId,
                    trackingStorageUnitId,
                  );
                convertedQuantity = conversionResult.convertedQuantity;
                console.log(
                  `🔄 Sales: Converted ${item.quantity} (unit ${item.unitId}) to ${convertedQuantity} (unit ${trackingStorageUnitId})`,
                );
              } catch (error) {
                console.error('Unit conversion failed for sales:', error);
                throw new BadRequestException(
                  `فشل في تحويل الوحدة من ${item.unitId} إلى ${trackingStorageUnitId}`,
                );
              }
            }

            // Check if there's enough quantity in the tracking (only for sales, not returns)
            if (!isReturn && Number(tracking.quantity) < convertedQuantity) {
              throw new BadRequestException(
                `لا يوجد مخزون كافي. المتاح: ${Number(tracking.quantity)}, المطلوب: ${convertedQuantity}`,
              );
            }
          }

          // Get per-item warehouse ID for returns (from item.toWarehouseId if available)
          const itemWarehouseId =
            isReturn && (item as any).toWarehouseId
              ? (item as any).toWarehouseId
              : warehouseId;

          await prisma.warehouseTransactionItem.create({
            data: {
              transactionId: warehouseTransaction.id,
              productId: item.productId,
              quantity: item.quantity, // Original quantity in the unit specified (negative for returns)
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              trackingId: item.trackingId || null,
              unitId: item.unitId || null,
              itemNote: isReturn
                ? `إرجاع لفاتورة ${invoice.invoiceNumber}`
                : `بيع من فاتورة ${invoice.invoiceNumber}`,
            },
          });

          // Update tracking quantity with converted quantity if specified
          if (item.trackingId) {
            if (isReturn) {
              // For returns, add items back to stock (use absolute value since quantity might be negative)
              const absoluteQuantity = Math.abs(convertedQuantity);
              await prisma.tracking.update({
                where: { id: item.trackingId },
                data: {
                  quantity: {
                    increment: absoluteQuantity, // Add back to stock
                  },
                },
              });
              console.log(
                `📦 Return: Increased tracking ${item.trackingId} by +${absoluteQuantity} (unit ${trackingStorageUnitId})`,
              );
            } else {
              // For sales, remove items from stock
              await prisma.tracking.update({
                where: { id: item.trackingId },
                data: {
                  quantity: {
                    decrement: convertedQuantity, // Use converted quantity
                  },
                },
              });
              console.log(
                `📦 Sales: Decreased tracking ${item.trackingId} by -${convertedQuantity} (unit ${trackingStorageUnitId})`,
              );
            }
          } else if (isReturn && itemWarehouseId) {
            // For returns without tracking, add items back to warehouse stock
            // Find or create stock entry for this product and warehouse
            let stock = await prisma.stock.findFirst({
              where: {
                productId: item.productId,
                warehouseId: itemWarehouseId,
              },
            });

            if (!stock) {
              // Create stock entry if it doesn't exist
              stock = await prisma.stock.create({
                data: {
                  productId: item.productId,
                  warehouseId: itemWarehouseId,
                },
              });
            }

            // Get product to determine storage unit
            const productForUnit = await prisma.product.findUnique({
              where: { id: item.productId },
              include: { salesUnit: true },
            });

            const storageUnitId = productForUnit?.salesUnitId || item.unitId;

            // Create or find a NONE tracking for returns without specific tracking
            const absoluteQuantity = Math.abs(convertedQuantity);
            const returnTracking = await prisma.tracking.findFirst({
              where: {
                stockId: stock.id,
                trackingType: 'NONE',
                isActive: true,
                isDeleted: false,
              },
            });

            if (returnTracking) {
              // Update existing NONE tracking
              await prisma.tracking.update({
                where: { id: returnTracking.id },
                data: {
                  quantity: {
                    increment: absoluteQuantity,
                  },
                },
              });
            } else {
              // Create new NONE tracking
              await prisma.tracking.create({
                data: {
                  stockId: stock.id,
                  trackingType: 'NONE',
                  quantity: absoluteQuantity,
                  storageUnitId: storageUnitId,
                  notes: `إرجاع من فاتورة ${invoice.invoiceNumber}`,
                },
              });
            }

            console.log(
              `📦 Return: Added ${absoluteQuantity} units of product ${item.productId} to warehouse ${itemWarehouseId} without tracking`,
            );
          }
        }
      }

      // 6. Handle payment splits and create InvoicePayment records
      const { payments, paymentType } = createSalesInvoiceDto;
      let actualPaidAmount = paidAmount;

      if (payments && payments.length > 0) {
        // New multi-method payment - create InvoicePayment records
        actualPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

        // Create a transaction for the payments if there are any
        if (actualPaidAmount > 0) {
          const paymentTransaction = await prisma.transaction.create({
            data: {
              date: new Date(),
              description: `دفعات على فاتورة ${invoice.invoiceNumber}`,
              clientId: clientId || null,
              salesInvoiceId: invoice.id,
              transactionType: 'RECEIPT',
            },
          });

          // Create accounting entries and invoice payments for each payment split
          for (const payment of payments) {
            // Validate account exists
            const account = await prisma.account.findUnique({
              where: { id: payment.accountId },
            });

            if (!account) {
              throw new NotFoundException(
                `الحساب بالمعرف ${payment.accountId} غير موجود`,
              );
            }

            // Create debit entry for the receiving account
            await prisma.transactionLine.create({
              data: {
                debit: payment.amount,
                credit: 0,
                accountId: payment.accountId,
                transactionId: paymentTransaction.id,
                clientId: clientId || null,
                description: `دفعة ${payment.paymentType} على فاتورة ${invoice.invoiceNumber}`,
              },
            });

            // Create InvoicePayment record
            await prisma.invoicePayment.create({
              data: {
                invoiceType: 'SALES_INVOICE',
                salesInvoiceId: invoice.id,
                amount: payment.amount,
                paymentType: payment.paymentType,
                accountId: payment.accountId,
                transactionId: paymentTransaction.id,
                notes: createSalesInvoiceDto.notes || null,
              },
            });
          }

          // Create credit entry for client account if client exists
          if (client && client.accountId) {
            await prisma.transactionLine.create({
              data: {
                debit: 0,
                credit: actualPaidAmount,
                accountId: client.accountId,
                transactionId: paymentTransaction.id,
                clientId: clientId,
                description: `تسوية ذمم مدينة للفاتورة ${invoice.invoiceNumber}`,
              },
            });
          }
        }
      } else if (paidAmount > 0 && paymentType) {
        // Legacy single payment - create InvoicePayment record if account can be determined
        // Note: For legacy payments, we might not have accountId, so we skip InvoicePayment creation
        // The payment will be tracked through the invoice's paidAmount field
      }

      // Update invoice with actual paid amount
      if (actualPaidAmount !== paidAmount) {
        const updatedRemainingAmount = finalTotalAmount - actualPaidAmount;
        let updatedStatus: InvoiceStatus = InvoiceStatus.UNPAID;
        if (actualPaidAmount > 0) {
          updatedStatus =
            actualPaidAmount >= finalTotalAmount
              ? InvoiceStatus.PAID
              : InvoiceStatus.PARTIAL;
        }

        await prisma.salesInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: new Decimal(actualPaidAmount),
            remainingAmount: new Decimal(updatedRemainingAmount),
            status: updatedStatus,
            paymentType:
              paymentType ||
              (payments && payments.length > 0
                ? payments[0].paymentType
                : 'CREDIT'),
          },
        });

        // Update invoice object for return (convert to Decimal for consistency)
        invoice.paidAmount = new Decimal(actualPaidAmount) as any;
        invoice.remainingAmount = new Decimal(updatedRemainingAmount) as any;
        invoice.status = updatedStatus;
      }

      // 7. Create accounting transaction for the sale (only if invoiceConfigId is provided)
      if (createSalesInvoiceDto.invoiceConfigId) {
        await this.createAutomaticAccountingTransaction(
          prisma,
          invoice,
          client,
          finalTotalAmount,
          actualPaidAmount,
          createSalesInvoiceDto.invoiceConfigId,
        );
      }

      return prisma.salesInvoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: true,
          currency: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: true,
        },
      });
    });
  }

  private async createAutomaticAccountingTransaction(
    prisma: any,
    invoice: any,
    client: any,
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

      console.log('=== SALES INVOICE CONFIG DEBUG ===');
      console.log('Using invoice config ID:', invoiceConfigId);
      console.log('Config:', config);
      console.log('Total Amount:', totalAmount);
      console.log('Is Return:', invoice.isReturn);

      // For returns (negative amounts), create reverse transaction
      if (invoice.isReturn && totalAmount < 0) {
        console.log('=== CREATING REVERSE TRANSACTION FOR RETURN ===');
        const absoluteAmount = Math.abs(totalAmount);

        // Create reverse transaction (swap debit and credit)
        const transaction = await prisma.transaction.create({
          data: {
            date: new Date(),
            description: `إرجاع فاتورة بيع ${invoice.originalInvoice?.invoiceNumber || 'غير محدد'} - ${invoice.invoiceNumber}${client ? ` - ${client.name}` : ' - عميل غير محدد'}`,
            transactionType: 'GENERAL',
          },
        });

        // Original sales invoice:
        // Debit: Cash/Receivables (debitAccountId)
        // Credit: Sales Revenue (creditAccountId)

        // Return should reverse this:
        // Debit: Sales Revenue (was credit, now debit)
        // Credit: Cash/Receivables (was debit, now credit)

        await prisma.transactionLine.createMany({
          data: [
            {
              transactionId: transaction.id,
              accountId: config.creditAccountId, // Sales Revenue - now DEBIT for return
              debit: absoluteAmount,
              credit: 0,
              description: `إرجاع مبيعات - ${invoice.invoiceNumber}`,
            },
            {
              transactionId: transaction.id,
              accountId: config.debitAccountId, // Cash/Receivables - now CREDIT for return
              debit: 0,
              credit: absoluteAmount,
              description: `إرجاع مبلغ للعميل - ${invoice.invoiceNumber}`,
              clientId: invoice.clientId,
            },
          ],
        });

        console.log('=== REVERSE TRANSACTION CREATED ===', transaction.id);

        // ربط المعاملة بالفاتورة
        try {
          await this.invoiceConfigsService.linkTransactionToInvoice(
            transaction.id,
            InvoiceType.SALES,
            invoice.id,
            prisma,
          );
        } catch (linkError) {
          console.error('فشل في ربط المعاملة بالفاتورة:', linkError);
        }

        return transaction;
      }

      // Normal sales invoice
      console.log('=== CALLING createAutomaticTransactionFromConfig ===');

      // إنشاء المعاملة التلقائية باستخدام التكوين المحدد
      const transaction =
        await this.invoiceConfigsService.createAutomaticTransactionFromConfig(
          config,
          totalAmount,
          `فاتورة بيع #${invoice.invoiceNumber}${client ? ` - ${client.name}` : ' - عميل غير محدد'}`,
          client?.id,
          null, // لا نمرر invoiceId هنا لتجنب foreign key constraint
        );

      // ربط المعاملة بالفاتورة بعد إنشائها
      if (transaction) {
        try {
          await this.invoiceConfigsService.linkTransactionToInvoice(
            transaction.id,
            InvoiceType.SALES,
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

      // لا نحتاج تحديث رصيد العميل - يُحسب من الحسابات المحاسبية
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
      clientId,
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

    if (clientId) {
      where.clientId = parseInt(clientId);
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
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [invoices, totalCount] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        include: {
          client: {
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
      this.prisma.salesInvoice.count({ where }),
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
    const invoice = await this.prisma.salesInvoice.findUnique({
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
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id, isDeleted: false },
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
          where: {
            isDeleted: false,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    barcode: true,
                  },
                },
                unit: {
                  select: {
                    id: true,
                    name: true,
                    symbol: true,
                  },
                },
              },
            },
          },
        },
        returnInvoicesNew: {
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
      throw new NotFoundException(`فاتورة البيع مع المعرف ${id} غير موجودة`);
    }

    // Calculate effective amounts
    const effectiveAmounts = await this.getEffectiveAmounts(id);

    return {
      ...invoice,
      effectiveAmounts,
    };
  }

  async update(id: number, updateSalesInvoiceDto: UpdateSalesInvoiceDto) {
    const existingInvoice = await this.findOne(id);

    // If updating amounts or discount, recalculate and update accounting
    const { totalAmount, paidAmount, discount, discountType, ...rest } =
      updateSalesInvoiceDto;

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

    return this.prisma.salesInvoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
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
        // Add specific field check here if salesInvoiceId exists in schema
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف فاتورة مرتبطة بمعاملات محاسبية',
      );
    }

    // Soft delete
    await this.prisma.salesInvoice.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'تم حذف فاتورة البيع بنجاح' };
  }

  async getInvoicesSummary(filters: any = {}) {
    const { clientId, status, startDate, endDate } = filters;

    const where: any = {
      isDeleted: false,
    };

    if (clientId) where.clientId = parseInt(clientId);
    if (status) where.status = status;

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const [totalInvoices, summary] = await Promise.all([
      this.prisma.salesInvoice.count({ where }),
      this.prisma.salesInvoice.aggregate({
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

    const statusSummary = await this.prisma.salesInvoice.groupBy({
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
   * Return items from a sales invoice
   * Creates a reverse accounting transaction
   */
  async returnInvoice(returnDto: ReturnSalesInvoiceDto, userId?: string) {
    this.logger.log(
      `Processing return for sales invoice ${returnDto.salesInvoiceId}`,
    );

    return this.prisma.$transaction(async (prisma) => {
      // 1. Get the original invoice with all details
      const originalInvoice = await prisma.salesInvoice.findUnique({
        where: { id: returnDto.salesInvoiceId, isDeleted: false },
        include: {
          client: { include: { account: true } },
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

      const returnInvoice = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: returnDto.referenceNumber || defaultReturnNumber,
          clientId: originalInvoice.clientId,
          totalAmount: -totalReturnAmount, // Negative amount for return
          paidAmount: 0,
          remainingAmount: -totalReturnAmount,
          status: InvoiceStatus.PAID, // Returns are considered paid
          invoiceDate: new Date(),
          description: `إرجاع من فاتورة ${originalInvoice.invoiceNumber}${returnDto.returnReason ? ` - ${returnDto.returnReason}` : ''}`,
          notes: returnDto.note,
          userId,
          // Mark as return invoice and link to original
          isReturn: true,
          originalInvoiceId: originalInvoice.id,
          invoiceConfigId: originalInvoice.invoiceConfigId, // Use same config as original invoice
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
              description: `إرجاع فاتورة بيع ${originalInvoice.invoiceNumber} - مبلغ ${totalReturnAmount}`,
              transactionType: 'GENERAL',
            },
          });

          // Original sales invoice:
          // Debit: Cash/Receivables (debitAccountId)
          // Credit: Sales Revenue (creditAccountId)

          // Return should reverse this:
          // Debit: Sales Revenue (was credit, now debit)
          // Credit: Cash/Receivables (was debit, now credit)

          await prisma.transactionLine.createMany({
            data: [
              {
                transactionId: transaction.id,
                accountId: invoiceConfig.creditAccountId, // Sales Revenue - now DEBIT
                debit: totalReturnAmount,
                credit: 0,
                description: `إرجاع مبيعات - ${originalInvoice.invoiceNumber}`,
              },
              {
                transactionId: transaction.id,
                accountId: invoiceConfig.debitAccountId, // Cash/Receivables - now CREDIT
                debit: 0,
                credit: totalReturnAmount,
                description: `إرجاع مبلغ للعميل - ${originalInvoice.invoiceNumber}`,
                clientId: originalInvoice.clientId,
              },
            ],
          });

          this.logger.log(
            `Created reverse accounting transaction ${transaction.id} for return`,
          );
        }
      }

      // 5. Update stock for returned items (add back to warehouse)
      for (const returnItem of returnDto.items) {
        // Find original item
        const originalItem = originalInvoice.items.find(
          (i) => i.id === returnItem.originalSalesInvoiceItemId,
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
        await prisma.salesInvoiceItem.create({
          data: {
            invoiceId: returnInvoice.id,
            productId: returnItem.productId,
            quantity: -returnItem.quantity, // Negative quantity for return
            unitPrice: returnItem.unitPrice,
            unitId: returnItem.unitId,
          },
        });

        // Update stock - add items back to tracking
        if (returnItem.trackingId) {
          const tracking = await prisma.tracking.findUnique({
            where: { id: returnItem.trackingId },
          });

          if (!tracking) {
            throw new BadRequestException(
              `التتبع ${returnItem.trackingId} غير موجود`,
            );
          }

          // Add quantity back to tracking
          await prisma.tracking.update({
            where: { id: returnItem.trackingId },
            data: {
              quantity: { increment: returnItem.quantity },
            },
          });
        }

        this.logger.log(
          `Added ${returnItem.quantity} units of product ${returnItem.productId} back to warehouse ${returnItem.toWarehouseId}`,
        );
      }

      // 6. Update original invoice remaining amount
      await prisma.salesInvoice.update({
        where: { id: originalInvoice.id },
        data: {
          remainingAmount: { decrement: totalReturnAmount }, // Reduce debt
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

  async getInvoiceReceipts(
    invoiceId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      salesInvoiceId: invoiceId,
      transactionType: 'RECEIPT',
    };

    const [receipts, total] = await Promise.all([
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
      data: receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
