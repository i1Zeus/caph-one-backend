import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, FilterPaymentsDto, UpdatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  // private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const {
      supplierId,
      amount,
      fromAccountId,
      payments,
      purchaseInvoiceId,
      date,
      description,
      notes,
      // reference,
    } = createPaymentDto;

    return await this.prisma.$transaction(async (tx) => {
      // التحقق من وجود المورد
      const supplier = await tx.client.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new NotFoundException('المورد غير موجود');
      }

      // Handle payment splits: use payments array if provided, otherwise fall back to legacy single payment
      let paymentSplits: Array<{
        amount: number;
        paymentType: any;
        accountId: number;
        invoiceConfigId?: number;
      }> = [];

      if (payments && payments.length > 0) {
        // New multi-method payment
        paymentSplits = payments;
      } else if (amount && fromAccountId) {
        // Legacy single payment - convert to payment split format
        paymentSplits = [
          {
            amount,
            paymentType: 'CASH' as any, // Default to CASH for legacy payments
            accountId: fromAccountId,
          },
        ];
      } else {
        throw new BadRequestException(
          'يجب توفير إما payments array أو amount و fromAccountId',
        );
      }

      // Validate all accounts exist
      for (const payment of paymentSplits) {
        const account = await tx.account.findUnique({
          where: { id: payment.accountId },
        });

        if (!account) {
          throw new NotFoundException(
            `الحساب بالمعرف ${payment.accountId} غير موجود`,
          );
        }
      }

      // Calculate total amount from payment splits
      const totalAmount = paymentSplits.reduce((sum, p) => sum + p.amount, 0);

      // التحقق من الفاتورة إذا تم تحديدها
      let purchaseInvoice = null;
      if (purchaseInvoiceId) {
        purchaseInvoice = await tx.purchaseInvoice.findUnique({
          where: { id: purchaseInvoiceId },
        });

        if (!purchaseInvoice) {
          throw new NotFoundException('فاتورة المشتريات غير موجودة');
        }

        if (purchaseInvoice.supplierId !== supplierId) {
          throw new BadRequestException('الفاتورة لا تخص هذا المورد');
        }

        // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
        if (totalAmount > Number(purchaseInvoice.remainingAmount)) {
          throw new BadRequestException(
            'المبلغ يتجاوز المبلغ المتبقي في الفاتورة',
          );
        }
      }

      // إنشاء المعاملة
      const transaction = await tx.transaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          description: description || `مدفوع للمورد: ${supplier.name}`,
          clientId: supplierId,
          purchaseInvoiceId: purchaseInvoiceId || null,
          transactionType: 'PAYMENT', // تحديد نوع المعاملة
        },
      });

      // Create accounting entries and invoice payments for each payment split
      for (const payment of paymentSplits) {
        // إنشاء خط المعاملة للحساب المدفوع منه (Credit)
        await tx.transactionLine.create({
          data: {
            debit: 0,
            credit: payment.amount,
            accountId: payment.accountId,
            transactionId: transaction.id,
            clientId: supplierId,
            description:
              description ||
              `مدفوع للمورد: ${supplier.name} - ${payment.paymentType}`,
          },
        });

        // Create InvoicePayment record if invoice is provided
        if (purchaseInvoiceId) {
          await tx.invoicePayment.create({
            data: {
              invoiceType: 'PURCHASE_INVOICE',
              purchaseInvoiceId: purchaseInvoiceId,
              amount: payment.amount,
              paymentType: payment.paymentType,
              accountId: payment.accountId,
              transactionId: transaction.id,
              notes: notes || null,
            },
          });
        }
      }

      // إنشاء خط المعاملة لحساب المورد (Debit) - single entry for total
      if (!supplier.accountId) {
        throw new BadRequestException(
          'المورد غير مرتبط بحساب محاسبي. يجب ربط المورد بحساب أولاً',
        );
      }

      await tx.transactionLine.create({
        data: {
          debit: totalAmount,
          credit: 0,
          accountId: supplier.accountId,
          transactionId: transaction.id,
          clientId: supplierId,
          description: description || `مدفوع للمورد: ${supplier.name}`,
        },
      });

      // تحديث الفاتورة إذا تم تحديدها
      if (purchaseInvoice) {
        const newPaidAmount =
          Number(purchaseInvoice.paidAmount || 0) + totalAmount;
        const remainingAmount =
          Number(purchaseInvoice.totalAmount) - newPaidAmount;

        let newStatus: InvoiceStatus = purchaseInvoice.status;
        if (remainingAmount <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIAL;
        }

        await tx.purchaseInvoice.update({
          where: { id: purchaseInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: Math.max(0, remainingAmount),
            status: newStatus,
          },
        });
      }

      return tx.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          client: true,
          entries: {
            include: {
              account: true,
            },
          },
          purchaseInvoice: {
            include: {
              payments: true,
            },
          },
          invoicePayments: true,
        },
      });
    });
  }

  async findAll(filters: FilterPaymentsDto) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      supplierId,
      clientId,
      accountId,
      invoiceId,
      type,
      search,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {
      isDeleted: false,
    };

    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    if (clientId || supplierId) {
      where.clientId = clientId || supplierId;
    }

    if (accountId) {
      where.lines = {
        some: {
          accountId: accountId,
        },
      };
    }

    if (invoiceId) {
      where.OR = [
        { salesInvoiceId: invoiceId },
        { purchaseInvoiceId: invoiceId },
      ];
    }

    if (type === 'receipt') {
      where.salesInvoiceId = { not: null };
    } else if (type === 'payment') {
      where.purchaseInvoiceId = { not: null };
    }

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          entries: {
            include: {
              account: true,
            },
          },
          client: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        entries: {
          where: { isDeleted: false },
          include: {
            account: true,
          },
        },
        client: true,
        purchaseInvoice: true,
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
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Payment/Receipt with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    const {
      supplierId,
      purchaseInvoiceId,
      date,
      description,
      notes,
      // reference,
      payments,
    } = updatePaymentDto;

    return await this.prisma.$transaction(async (tx) => {
      // Get existing transaction with all related data
      const existingTransaction = await tx.transaction.findUnique({
        where: { id, isDeleted: false },
        include: {
          entries: {
            where: { isDeleted: false },
            include: { account: true },
          },
          client: true,
          purchaseInvoice: true,
          invoicePayments: {
            where: { isDeleted: false },
          },
        },
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // Calculate old total amount from existing entries
      const oldDebitEntry = existingTransaction.entries.find(
        (entry) => entry.debit > 0,
      );
      const oldTotalAmount = oldDebitEntry?.debit || 0;

      // Determine the new supplier (use existing if not provided)
      const newSupplierId = supplierId ?? existingTransaction.clientId;
      let supplier = existingTransaction.client;

      if (supplierId && supplierId !== existingTransaction.clientId) {
        // Supplier is changing - validate new supplier
        supplier = await tx.client.findUnique({
          where: { id: supplierId },
        });

        if (!supplier) {
          throw new NotFoundException('المورد غير موجود');
        }

        if (!supplier.accountId) {
          throw new BadRequestException(
            'المورد غير مرتبط بحساب محاسبي. يجب ربط المورد بحساب أولاً',
          );
        }
      }

      // Handle payment splits
      let paymentSplits: Array<{
        amount: number;
        paymentType: any;
        accountId: number;
      }> = [];
      let newTotalAmount = oldTotalAmount;

      if (payments && payments.length > 0) {
        paymentSplits = payments;
        newTotalAmount = paymentSplits.reduce((sum, p) => sum + p.amount, 0);

        // Validate all accounts exist
        for (const payment of paymentSplits) {
          const account = await tx.account.findUnique({
            where: { id: payment.accountId },
          });

          if (!account) {
            throw new NotFoundException(
              `الحساب بالمعرف ${payment.accountId} غير موجود`,
            );
          }
        }
      }

      // Handle invoice changes
      const oldInvoiceId = existingTransaction.purchaseInvoiceId;
      const newInvoiceId =
        purchaseInvoiceId !== undefined ? purchaseInvoiceId : oldInvoiceId;

      // If old invoice exists and is being changed or removed, revert its paid amount
      if (oldInvoiceId && oldInvoiceId !== newInvoiceId) {
        const oldInvoice = await tx.purchaseInvoice.findUnique({
          where: { id: oldInvoiceId },
        });

        if (oldInvoice) {
          const revertedPaidAmount = Math.max(
            0,
            Number(oldInvoice.paidAmount) - oldTotalAmount,
          );
          const revertedRemainingAmount =
            Number(oldInvoice.totalAmount) - revertedPaidAmount;

          let revertedStatus: InvoiceStatus = InvoiceStatus.UNPAID;
          if (revertedPaidAmount >= Number(oldInvoice.totalAmount)) {
            revertedStatus = InvoiceStatus.PAID;
          } else if (revertedPaidAmount > 0) {
            revertedStatus = InvoiceStatus.PARTIAL;
          }

          await tx.purchaseInvoice.update({
            where: { id: oldInvoiceId },
            data: {
              paidAmount: revertedPaidAmount,
              remainingAmount: Math.max(0, revertedRemainingAmount),
              status: revertedStatus,
            },
          });
        }
      }

      // Validate new invoice if provided
      let newInvoice = null;
      if (newInvoiceId) {
        newInvoice = await tx.purchaseInvoice.findUnique({
          where: { id: newInvoiceId },
        });

        if (!newInvoice) {
          throw new NotFoundException('فاتورة المشتريات غير موجودة');
        }

        if (newInvoice.supplierId !== newSupplierId) {
          throw new BadRequestException('الفاتورة لا تخص هذا المورد');
        }

        // Calculate available amount for this invoice
        let availableAmount = Number(newInvoice.remainingAmount);

        // If same invoice, add back old amount
        if (oldInvoiceId === newInvoiceId) {
          availableAmount += oldTotalAmount;
        }

        if (newTotalAmount > availableAmount) {
          throw new BadRequestException(
            `المبلغ يتجاوز المبلغ المتبقي في الفاتورة (${availableAmount})`,
          );
        }
      }

      // Delete old transaction entries
      await tx.transactionLine.updateMany({
        where: { transactionId: id },
        data: { isDeleted: true },
      });

      // Delete old invoice payments
      await tx.invoicePayment.updateMany({
        where: { transactionId: id },
        data: { isDeleted: true },
      });

      // Update the transaction
      await tx.transaction.update({
        where: { id },
        data: {
          date: date ? new Date(date) : undefined,
          description: description !== undefined ? description : undefined,
          clientId: newSupplierId,
          purchaseInvoiceId: newInvoiceId || null,
        },
      });

      // Create new entries and invoice payments if payments array is provided
      if (payments && payments.length > 0) {
        for (const payment of paymentSplits) {
          // Create credit entry (from account)
          await tx.transactionLine.create({
            data: {
              debit: 0,
              credit: payment.amount,
              accountId: payment.accountId,
              transactionId: id,
              clientId: newSupplierId,
              description:
                description ||
                `مدفوع للمورد: ${supplier?.name} - ${payment.paymentType}`,
            },
          });

          // Create invoice payment if invoice is linked
          if (newInvoiceId) {
            await tx.invoicePayment.create({
              data: {
                invoiceType: 'PURCHASE_INVOICE',
                purchaseInvoiceId: newInvoiceId,
                amount: payment.amount,
                paymentType: payment.paymentType,
                accountId: payment.accountId,
                transactionId: id,
                notes: notes || null,
              },
            });
          }
        }

        // Create debit entry (supplier account)
        if (!supplier?.accountId) {
          throw new BadRequestException(
            'المورد غير مرتبط بحساب محاسبي. يجب ربط المورد بحساب أولاً',
          );
        }

        await tx.transactionLine.create({
          data: {
            debit: newTotalAmount,
            credit: 0,
            accountId: supplier.accountId,
            transactionId: id,
            clientId: newSupplierId,
            description: description || `مدفوع للمورد: ${supplier?.name}`,
          },
        });
      }

      // Update new invoice amounts if it changed or if amount changed
      if (
        newInvoice &&
        (newInvoiceId !== oldInvoiceId || newTotalAmount !== oldTotalAmount)
      ) {
        let newPaidAmount: number;

        if (oldInvoiceId === newInvoiceId) {
          // Same invoice - calculate difference
          newPaidAmount =
            Number(newInvoice.paidAmount) - oldTotalAmount + newTotalAmount;
        } else {
          // New invoice - add the full amount
          newPaidAmount = Number(newInvoice.paidAmount) + newTotalAmount;
        }

        const newRemainingAmount =
          Number(newInvoice.totalAmount) - newPaidAmount;

        let newStatus: InvoiceStatus = InvoiceStatus.UNPAID;
        if (newRemainingAmount <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIAL;
        }

        await tx.purchaseInvoice.update({
          where: { id: newInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: Math.max(0, newRemainingAmount),
            status: newStatus,
          },
        });
      }

      // Return updated transaction
      return tx.transaction.findUnique({
        where: { id },
        include: {
          client: true,
          entries: {
            where: { isDeleted: false },
            include: { account: true },
          },
          purchaseInvoice: {
            include: { payments: true },
          },
          invoicePayments: {
            where: { isDeleted: false },
          },
        },
      });
    });
  }

  async remove(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Payment/Receipt with ID ${id} not found`);
    }

    // حذف المعاملة (soft delete)
    await this.prisma.transaction.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'Payment/Receipt deleted successfully' };
  }

  // طريقة جديدة لجلب المدفوعات بالتنسيق الصحيح
  async findPayments(filters: FilterPaymentsDto = {}) {
    const {
      page = 1,
      limit = 20,
      clientId,
      supplierId,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * limit;

    // إنشاء شروط البحث للمدفوعات فقط
    const whereClause: any = {
      isDeleted: false,
      transactionType: 'PAYMENT', // استخدام نوع المعاملة الجديد
    };

    if (clientId || supplierId) {
      whereClause.clientId = clientId || supplierId;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    // جلب المعاملات وتحويلها إلى تنسيق Payment
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereClause,
        include: {
          entries: {
            where: { isDeleted: false },
            include: {
              account: true,
            },
          },
          client: true,
          purchaseInvoice: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: whereClause,
      }),
    ]);

    // تحويل المعاملات إلى تنسيق Payment
    const payments = transactions.map((transaction) => {
      // Get non-deleted entries
      const activeEntries = transaction.entries || [];

      // Find debit entry (supplier's account) - this contains the total amount
      const debitEntry = activeEntries.find((entry) => entry.debit > 0);

      // Find credit entries (cash/bank accounts)
      const creditEntries = activeEntries.filter((entry) => entry.credit > 0);
      const firstCreditEntry = creditEntries[0];

      // Calculate total amount from debit entry or sum of credit entries
      const amount =
        debitEntry?.debit ||
        creditEntries.reduce((sum, entry) => sum + entry.credit, 0) ||
        0;

      return {
        id: transaction.id,
        supplierId: transaction.clientId,
        supplier: transaction.client,
        amount: amount,
        fromAccountId: firstCreditEntry?.accountId,
        fromAccount: firstCreditEntry?.account,
        purchaseInvoiceId: transaction.purchaseInvoiceId,
        purchaseInvoice: transaction.purchaseInvoice,
        date: transaction.date,
        description: transaction.description,
        notes: null,
        reference: `T-${transaction.id}`,
        transaction: transaction,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };
    });

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
