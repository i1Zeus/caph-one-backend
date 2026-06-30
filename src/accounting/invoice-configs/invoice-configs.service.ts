import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInvoiceConfigDto,
  InvoiceType,
  PaymentType,
  UpdateInvoiceConfigDto,
} from './dto';

@Injectable()
export class InvoiceConfigsService {
  private readonly logger = new Logger(InvoiceConfigsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createInvoiceConfigDto: CreateInvoiceConfigDto) {
    const {
      name,
      invoiceType,
      paymentType,
      debitAccountId,
      creditAccountId,
      description,
      isActive,
    } = createInvoiceConfigDto;

    // التحقق من وجود الحسابات
    const [debitAccount, creditAccount] = await Promise.all([
      this.prisma.account.findUnique({ where: { id: debitAccountId } }),
      this.prisma.account.findUnique({ where: { id: creditAccountId } }),
    ]);

    if (!debitAccount) {
      throw new NotFoundException('الحساب المدين غير موجود');
    }

    if (!creditAccount) {
      throw new NotFoundException('الحساب الدائن غير موجود');
    }

    // Note: Name uniqueness is not enforced at database level
    // You can optionally check for duplicates here if needed

    return this.prisma.invoiceAccountingConfig.create({
      data: {
        name,
        invoiceType: invoiceType as any,
        paymentType: paymentType as any,
        debitAccountId,
        creditAccountId,
        description,
        isActive: isActive ?? true,
      },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });
  }

  async findAll() {
    return this.prisma.invoiceAccountingConfig.findMany({
      where: { isDeleted: false },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
      orderBy: [{ invoiceType: 'asc' }, { paymentType: 'asc' }],
    });
  }

  async findOne(id: number) {
    const config = await this.prisma.invoiceAccountingConfig.findUnique({
      where: { id },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    if (!config || config.isDeleted) {
      throw new NotFoundException('التكوين غير موجود');
    }

    return config;
  }

  async findByInvoiceAndPaymentType(
    invoiceType: InvoiceType,
    paymentType: PaymentType,
  ) {
    console.log('=== SEARCHING FOR CONFIG ===');
    console.log('Search params:', { invoiceType, paymentType });

    const config = await this.prisma.invoiceAccountingConfig.findFirst({
      where: {
        invoiceType: invoiceType as any,
        paymentType: paymentType as any,
        isActive: true,
        isDeleted: false,
      },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    console.log('Found config result:', config);

    if (!config) {
      throw new NotFoundException(
        `لم يتم العثور على تكوين للفاتورة من نوع ${invoiceType} والدفع من نوع ${paymentType}`,
      );
    }

    return config;
  }

  async update(id: number, updateInvoiceConfigDto: UpdateInvoiceConfigDto) {
    const config = await this.findOne(id);

    // const { name, debitAccountId, creditAccountId } = updateInvoiceConfigDto;
    const { debitAccountId, creditAccountId } = updateInvoiceConfigDto;

    // التحقق من الحسابات الجديدة إذا تم تغييرها
    if (debitAccountId && debitAccountId !== config.debitAccountId) {
      const debitAccount = await this.prisma.account.findUnique({
        where: { id: debitAccountId },
      });
      if (!debitAccount) {
        throw new NotFoundException('الحساب المدين الجديد غير موجود');
      }
    }

    if (creditAccountId && creditAccountId !== config.creditAccountId) {
      const creditAccount = await this.prisma.account.findUnique({
        where: { id: creditAccountId },
      });
      if (!creditAccount) {
        throw new NotFoundException('الحساب الدائن الجديد غير موجود');
      }
    }

    // Note: Name uniqueness is not enforced at database level
    // You can optionally check for duplicates here if needed

    return this.prisma.invoiceAccountingConfig.update({
      where: { id },
      data: updateInvoiceConfigDto as any,
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });
  }

  async remove(id: number) {
    // const config = await this.findOne(id);

    return this.prisma.invoiceAccountingConfig.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // دالة مساعدة لإنشاء المعاملات المحاسبية التلقائية
  async createAutomaticTransaction(
    invoiceType: InvoiceType,
    paymentType: PaymentType,
    amount: number,
    description: string,
    clientId?: number,
    invoiceId?: number,
  ) {
    console.log('=== INVOICE CONFIG SERVICE DEBUG ===');
    console.log('Looking for config with:', { invoiceType, paymentType });

    const config = await this.findByInvoiceAndPaymentType(
      invoiceType,
      paymentType,
    );

    console.log('Found config:', config);
    console.log(
      'Debit Account ID:',
      config.debitAccountId,
      'Credit Account ID:',
      config.creditAccountId,
    );

    return this.prisma.$transaction(async (tx) => {
      // إنشاء المعاملة (بدون ربط الفاتورة في البداية)
      const transaction = await tx.transaction.create({
        data: {
          date: new Date(),
          description,
          clientId,
          transactionType: 'INVOICE', // تحديد نوع المعاملة للفواتير
        },
      });

      // إنشاء خط المعاملة المدين
      await tx.transactionLine.create({
        data: {
          date: new Date(),
          debit: amount,
          credit: 0,
          accountId: config.debitAccountId,
          transactionId: transaction.id,
          clientId,
          description: `${description} - مدين`,
        },
      });

      // إنشاء خط المعاملة الدائن
      await tx.transactionLine.create({
        data: {
          date: new Date(),
          debit: 0,
          credit: amount,
          accountId: config.creditAccountId,
          transactionId: transaction.id,
          clientId,
          description: `${description} - دائن`,
        },
      });

      // تحديث المعاملة بربط الفاتورة إذا تم توفير معرف الفاتورة
      if (invoiceId) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            ...(invoiceType === InvoiceType.SALES
              ? { salesInvoiceId: invoiceId }
              : {}),
            ...(invoiceType === InvoiceType.PURCHASE
              ? { purchaseInvoiceId: invoiceId }
              : {}),
          },
        });
      }

      return transaction;
    });
  }

  // طريقة جديدة لإنشاء المعاملة بعد إنشاء الفاتورة
  async linkTransactionToInvoice(
    transactionId: number,
    invoiceType: InvoiceType,
    invoiceId: number,
    prisma?: any,
  ) {
    const client = prisma || this.prisma;
    return client.transaction.update({
      where: { id: transactionId },
      data: {
        ...(invoiceType === InvoiceType.SALES
          ? { salesInvoiceId: invoiceId }
          : {}),
        ...(invoiceType === InvoiceType.PURCHASE
          ? { purchaseInvoiceId: invoiceId }
          : {}),
      },
    });
  }

  // دالة مساعدة للبحث عن تكوين بواسطة المعرف
  async findById(id: number) {
    const config = await this.prisma.invoiceAccountingConfig.findUnique({
      where: { id },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    if (!config || config.isDeleted) {
      throw new NotFoundException('التكوين غير موجود');
    }

    return config;
  }

  // دالة مساعدة لإنشاء المعاملات المحاسبية التلقائية من تكوين محدد
  async createAutomaticTransactionFromConfig(
    config: any, // InvoiceAccountingConfig object
    amount: number,
    description: string,
    clientId?: number,
    invoiceId?: number,
  ) {
    console.log('=== INVOICE CONFIG SERVICE DEBUG (From Config) ===');
    console.log('Using config:', config);
    console.log(
      'Debit Account ID:',
      config.debitAccountId,
      'Credit Account ID:',
      config.creditAccountId,
    );

    return this.prisma.$transaction(async (tx) => {
      // إنشاء المعاملة (بدون ربط الفاتورة في البداية)
      const transaction = await tx.transaction.create({
        data: {
          date: new Date(),
          description,
          clientId,
          transactionType: 'INVOICE', // تحديد نوع المعاملة للفواتير
        },
      });

      // إنشاء خط المعاملة المدين
      await tx.transactionLine.create({
        data: {
          date: new Date(),
          debit: amount,
          credit: 0,
          accountId: config.debitAccountId,
          transactionId: transaction.id,
          clientId,
          description: `${description} - مدين`,
        },
      });

      // إنشاء خط المعاملة الدائن
      await tx.transactionLine.create({
        data: {
          date: new Date(),
          debit: 0,
          credit: amount,
          accountId: config.creditAccountId,
          transactionId: transaction.id,
          clientId,
          description: `${description} - دائن`,
        },
      });

      // تحديث المعاملة بربط الفاتورة إذا تم توفير معرف الفاتورة
      if (invoiceId) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            ...(config.invoiceType === 'SALES'
              ? { salesInvoiceId: invoiceId }
              : {}),
            ...(config.invoiceType === 'PURCHASE'
              ? { purchaseInvoiceId: invoiceId }
              : {}),
          },
        });
      }

      return transaction;
    });
  }
}
