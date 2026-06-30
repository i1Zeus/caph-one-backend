import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceiptDto, FilterReceiptsDto, UpdateReceiptDto } from './dto';

@Injectable()
export class ReceiptsService {
  // private readonly logger = new Logger(ReceiptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReceipt(createReceiptDto: CreateReceiptDto) {
    const {
      clientId,
      amount,
      toAccountId,
      payments,
      salesInvoiceId,
      date,
      description,
      notes,
      // reference,
    } = createReceiptDto;

    return await this.prisma.$transaction(async (tx) => {
      // التحقق من وجود العميل
      const client = await tx.client.findUnique({
        where: { id: clientId },
        include: { account: true },
      });

      if (!client) {
        throw new NotFoundException('العميل غير موجود');
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
      } else if (amount && toAccountId) {
        // Legacy single payment - convert to payment split format
        paymentSplits = [
          {
            amount,
            paymentType: 'CASH' as any, // Default to CASH for legacy payments
            accountId: toAccountId,
          },
        ];
      } else {
        throw new BadRequestException(
          'يجب توفير إما payments array أو amount و toAccountId',
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
      let salesInvoice = null;
      if (salesInvoiceId) {
        salesInvoice = await tx.salesInvoice.findUnique({
          where: { id: salesInvoiceId },
        });

        if (!salesInvoice) {
          throw new NotFoundException('فاتورة المبيعات غير موجودة');
        }

        if (salesInvoice.clientId !== clientId) {
          throw new BadRequestException('الفاتورة لا تخص هذا العميل');
        }

        // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
        if (totalAmount > Number(salesInvoice.remainingAmount)) {
          throw new BadRequestException(
            'المبلغ يتجاوز المبلغ المتبقي في الفاتورة',
          );
        }
      }

      // إنشاء المعاملة
      const transaction = await tx.transaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          description: description || `مقبوض من العميل: ${client.name}`,
          clientId: clientId,
          salesInvoiceId: salesInvoiceId || null,
          transactionType: 'RECEIPT', // تحديد نوع المعاملة
        },
      });

      // Create accounting entries and invoice payments for each payment split
      for (const payment of paymentSplits) {
        // إنشاء خط المعاملة للحساب المستلم (Debit)
        await tx.transactionLine.create({
          data: {
            debit: payment.amount,
            credit: 0,
            accountId: payment.accountId,
            transactionId: transaction.id,
            clientId: clientId,
            description:
              description || `مقبوض من ${client.name} - ${payment.paymentType}`,
          },
        });

        // Create InvoicePayment record if invoice is provided
        if (salesInvoiceId) {
          await tx.invoicePayment.create({
            data: {
              invoiceType: 'SALES_INVOICE',
              salesInvoiceId: salesInvoiceId,
              amount: payment.amount,
              paymentType: payment.paymentType,
              accountId: payment.accountId,
              transactionId: transaction.id,
              notes: notes || null,
            },
          });
        }
      }

      // إنشاء خط المعاملة لحساب العميل (Credit) - single entry for total
      if (client.accountId) {
        await tx.transactionLine.create({
          data: {
            debit: 0,
            credit: totalAmount,
            accountId: client.accountId,
            transactionId: transaction.id,
            clientId: clientId,
            description: description || `مقبوض من ${client.name}`,
          },
        });
      }

      // لا نحتاج تحديث رصيد العميل - يُحسب من الحسابات المحاسبية

      // تحديث الفاتورة إذا تم تحديدها
      if (salesInvoice) {
        const newPaidAmount =
          Number(salesInvoice.paidAmount || 0) + totalAmount;
        const remainingAmount =
          Number(salesInvoice.totalAmount) - newPaidAmount;

        let newStatus: InvoiceStatus = salesInvoice.status;
        if (remainingAmount <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIAL;
        }

        await tx.salesInvoice.update({
          where: { id: salesInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: Math.max(0, remainingAmount),
            status: newStatus,
          },
        });
      }

      // إرجاع المعاملة مع التفاصيل
      return tx.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          client: {
            include: {
              account: true,
            },
          },
          entries: {
            include: {
              account: true,
            },
          },
          salesInvoice: {
            include: {
              payments: true,
            },
          },
          invoicePayments: true,
        },
      });
    });
  }

  async findAll(filterDto: FilterReceiptsDto) {
    const {
      startDate,
      endDate,
      clientId,
      accountId,
      invoiceId,
      search,
      page = 1,
      limit = 20,
    } = filterDto;

    const where: any = {
      // تصفية للمقبوضات فقط (المعاملات التي لها مبالغ debit في الحسابات النقدية)
      entries: {
        some: {
          debit: {
            gt: 0,
          },
          account: {
            OR: [
              { isCash: true },
              {
                type: 'ASSET',
                name: { contains: 'cash', mode: 'insensitive' },
              },
              {
                type: 'ASSET',
                name: { contains: 'bank', mode: 'insensitive' },
              },
            ],
          },
        },
      },
    };

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) };
    }

    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (accountId) {
      where.entries = {
        ...where.entries,
        some: {
          ...where.entries.some,
          accountId: accountId,
        },
      };
    }

    if (invoiceId) {
      where.salesInvoiceId = invoiceId;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [receipts] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          client: {
            include: {
              account: true,
            },
          },
          entries: {
            include: {
              account: true,
            },
          },
          salesInvoice: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return receipts;
  }

  async findOne(id: number) {
    const receipt = await this.prisma.transaction.findUnique({
      where: { id, isDeleted: false },
      include: {
        client: {
          include: {
            account: true,
          },
        },
        entries: {
          where: { isDeleted: false },
          include: {
            account: true,
          },
        },
        salesInvoice: true,
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

    if (!receipt) {
      throw new NotFoundException('المقبوض غير موجود');
    }

    return receipt;
  }

  async update(id: number, updateReceiptDto: UpdateReceiptDto) {
    const {
      clientId,
      salesInvoiceId,
      date,
      description,
      notes,
      // reference,
      payments,
    } = updateReceiptDto;

    return await this.prisma.$transaction(async (tx) => {
      // Get existing transaction with all related data
      const existingTransaction = await tx.transaction.findUnique({
        where: { id, isDeleted: false },
        include: {
          entries: {
            where: { isDeleted: false },
            include: { account: true },
          },
          client: {
            include: { account: true },
          },
          salesInvoice: true,
          invoicePayments: {
            where: { isDeleted: false },
          },
        },
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Receipt with ID ${id} not found`);
      }

      // Calculate old total amount from existing entries (credit entry to client account)
      const oldCreditEntry = existingTransaction.entries.find(
        (entry) => entry.credit > 0,
      );
      const oldTotalAmount = oldCreditEntry?.credit || 0;

      // Determine the new client (use existing if not provided)
      const newClientId = clientId ?? existingTransaction.clientId;
      let client = existingTransaction.client;

      if (clientId && clientId !== existingTransaction.clientId) {
        // Client is changing - validate new client
        client = await tx.client.findUnique({
          where: { id: clientId },
          include: { account: true },
        });

        if (!client) {
          throw new NotFoundException('العميل غير موجود');
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
      const oldInvoiceId = existingTransaction.salesInvoiceId;
      const newInvoiceId =
        salesInvoiceId !== undefined ? salesInvoiceId : oldInvoiceId;

      // If old invoice exists and is being changed or removed, revert its paid amount
      if (oldInvoiceId && oldInvoiceId !== newInvoiceId) {
        const oldInvoice = await tx.salesInvoice.findUnique({
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

          await tx.salesInvoice.update({
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
        newInvoice = await tx.salesInvoice.findUnique({
          where: { id: newInvoiceId },
        });

        if (!newInvoice) {
          throw new NotFoundException('فاتورة المبيعات غير موجودة');
        }

        if (newInvoice.clientId !== newClientId) {
          throw new BadRequestException('الفاتورة لا تخص هذا العميل');
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
          clientId: newClientId,
          salesInvoiceId: newInvoiceId || null,
        },
      });

      // Create new entries and invoice payments if payments array is provided
      if (payments && payments.length > 0) {
        for (const payment of paymentSplits) {
          // Create debit entry (cash/bank account receiving money)
          await tx.transactionLine.create({
            data: {
              debit: payment.amount,
              credit: 0,
              accountId: payment.accountId,
              transactionId: id,
              clientId: newClientId,
              description:
                description ||
                `مقبوض من ${client?.name} - ${payment.paymentType}`,
            },
          });

          // Create invoice payment if invoice is linked
          if (newInvoiceId) {
            await tx.invoicePayment.create({
              data: {
                invoiceType: 'SALES_INVOICE',
                salesInvoiceId: newInvoiceId,
                amount: payment.amount,
                paymentType: payment.paymentType,
                accountId: payment.accountId,
                transactionId: id,
                notes: notes || null,
              },
            });
          }
        }

        // Create credit entry (client's account)
        if (client?.accountId) {
          await tx.transactionLine.create({
            data: {
              debit: 0,
              credit: newTotalAmount,
              accountId: client.accountId,
              transactionId: id,
              clientId: newClientId,
              description: description || `مقبوض من ${client?.name}`,
            },
          });
        }
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

        await tx.salesInvoice.update({
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
          client: {
            include: { account: true },
          },
          entries: {
            where: { isDeleted: false },
            include: { account: true },
          },
          salesInvoice: {
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
    return await this.prisma.$transaction(async (tx) => {
      // العثور على المعاملة
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: {
          entries: true,
          salesInvoice: true,
          client: true,
          invoicePayments: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('المقبوض غير موجود');
      }

      // حساب مبلغ المقبوض من مدخلات المعاملة أو من invoice payments
      const receiptAmount =
        transaction.invoicePayments.length > 0
          ? transaction.invoicePayments.reduce(
              (sum, p) => sum + Number(p.amount),
              0,
            )
          : transaction.entries
              .filter((entry) => entry.debit > 0)
              .reduce((sum, entry) => sum + entry.debit, 0);

      // لا نحتاج التراجع عن تحديث رصيد العميل - يُحسب من الحسابات المحاسبية

      // التراجع عن تحديث الفاتورة إذا كانت مرتبطة
      if (transaction.salesInvoiceId && transaction.salesInvoice) {
        const newPaidAmount = Math.max(
          0,
          Number(transaction.salesInvoice.paidAmount) - receiptAmount,
        );
        const newRemainingAmount =
          Number(transaction.salesInvoice.totalAmount) - newPaidAmount;

        let newStatus: InvoiceStatus = InvoiceStatus.UNPAID;
        if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIAL;
        }
        if (newRemainingAmount <= 0) {
          newStatus = InvoiceStatus.PAID;
        }

        await tx.salesInvoice.update({
          where: { id: transaction.salesInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        });
      }

      // حذف invoice payments المرتبطة
      await tx.invoicePayment.deleteMany({
        where: { transactionId: id },
      });

      // حذف مدخلات المعاملة
      await tx.transactionLine.deleteMany({
        where: { transactionId: id },
      });

      // حذف المعاملة
      await tx.transaction.delete({
        where: { id },
      });

      return { message: 'تم حذف المقبوض بنجاح' };
    });
  }

  // طريقة جديدة لجلب المقبوضات بالتنسيق الصحيح
  async findReceipts(filters: FilterReceiptsDto = {}) {
    const { page = 1, limit = 20, clientId, startDate, endDate } = filters;

    const skip = (page - 1) * limit;

    // إنشاء شروط البحث للمقبوضات فقط
    const whereClause: any = {
      isDeleted: false,
      transactionType: 'RECEIPT', // استخدام نوع المعاملة الجديد
    };

    if (clientId) {
      whereClause.clientId = clientId;
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

    // جلب المعاملات وتحويلها إلى تنسيق Receipt
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
          salesInvoice: true,
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

    // تحويل المعاملات إلى تنسيق Receipt
    const receipts = transactions.map((transaction) => {
      // Get non-deleted entries
      const activeEntries = transaction.entries || [];

      // Find credit entry (client's account) - this contains the total amount
      const creditEntry = activeEntries.find((entry) => entry.credit > 0);

      // Find debit entries (cash/bank accounts receiving money)
      const debitEntries = activeEntries.filter((entry) => entry.debit > 0);
      const firstDebitEntry = debitEntries[0];

      // Calculate total amount from credit entry or sum of debit entries
      const amount =
        creditEntry?.credit ||
        debitEntries.reduce((sum, entry) => sum + entry.debit, 0) ||
        0;

      return {
        id: transaction.id,
        clientId: transaction.clientId,
        client: transaction.client,
        amount: amount,
        toAccountId: firstDebitEntry?.accountId, // الحساب الذي استلم النقد
        toAccount: firstDebitEntry?.account,
        salesInvoiceId: transaction.salesInvoiceId,
        salesInvoice: transaction.salesInvoice,
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
      data: receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
