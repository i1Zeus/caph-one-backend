import { PrismaClient, AccountType, ClientType } from '@prisma/client';

const prisma = new PrismaClient();

// الحسابات الأساسية فقط
const chartOfAccounts = [
  { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
  { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
  { code: '2100', name: 'الموردون', type: AccountType.LIABILITY, isCash: false },
  { code: '4100', name: 'المبيعات', type: AccountType.REVENUE, isCash: false },
  { code: '5100', name: 'المشتريات', type: AccountType.EXPENSE, isCash: false },
  { code: '5200', name: 'المصروفات', type: AccountType.EXPENSE, isCash: false },
];

// عملاء وموردون تجريبيون
const sampleClients = [
  { name: 'شركة النور للتجارة', phone: '07901234567', type: ClientType.CUSTOMER },
  { name: 'محل الأمين', phone: '07801234567', type: ClientType.CUSTOMER },
  { name: 'شركة الفرات للمواد', phone: '07701234567', type: ClientType.CUSTOMER },
];

const sampleSuppliers = [
  { name: 'شركة بغداد للتوريد', phone: '07601234567', type: ClientType.SUPPLIER },
  { name: 'مؤسسة الرافدين', phone: '07501234567', type: ClientType.SUPPLIER },
  { name: 'شركة الشرق الأوسط', phone: '07401234567', type: ClientType.SUPPLIER },
];

// تكوينات الفواتير المبسطة
const invoiceConfigs = [
  {
    name: 'Sales - Cash',
    invoiceType: 'SALES',
    paymentType: 'CASH',
    debitAccountCode: '1100', // الصندوق
    creditAccountCode: '4100', // المبيعات
    description: 'فاتورة مبيعات نقدية',
  },
  {
    name: 'Sales - Credit',
    invoiceType: 'SALES',
    paymentType: 'CREDIT',
    debitAccountCode: '1200', // العملاء
    creditAccountCode: '4100', // المبيعات
    description: 'فاتورة مبيعات آجلة',
  },
  {
    name: 'Purchase - Cash',
    invoiceType: 'PURCHASE',
    paymentType: 'CASH',
    debitAccountCode: '5100', // المشتريات
    creditAccountCode: '1100', // الصندوق
    description: 'فاتورة مشتريات نقدية',
  },
  {
    name: 'Purchase - Credit',
    invoiceType: 'PURCHASE',
    paymentType: 'CREDIT',
    debitAccountCode: '5100', // المشتريات
    creditAccountCode: '2100', // الموردون
    description: 'فاتورة مشتريات آجلة',
  },
];

async function seedAccounts() {
  console.log('🌱 بدء إدخال الحسابات والعملاء والموردين...');

  try {
    // الحصول على العملة الرئيسية أو إنشاؤها
    let mainCurrency = await prisma.currency.findFirst({
      where: { isMain: true }
    });

    if (!mainCurrency) {
      console.log('💰 إنشاء العملة الرئيسية...');
      mainCurrency = await prisma.currency.create({
        data: {
          name: 'الدينار العراقي',
          code: 'IQD',
          symbol: 'د.ع',
          rate: 1.0,
          isMain: true,
          decimalPlaces: 0,
          isActive: true
        }
      });
      console.log('✅ تم إنشاء العملة الرئيسية');
    }

    // إنشاء الحسابات الأساسية
    const createdAccounts: { [key: string]: any } = {};
    
    for (const account of chartOfAccounts) {
      const existingAccount = await prisma.account.findFirst({
        where: {
          name: `${account.code} - ${account.name}`,
          isDeleted: false
        }
      });

      if (!existingAccount) {
        const newAccount = await prisma.account.create({
          data: {
            name: `${account.code} - ${account.name}`,
            type: account.type,
            isCash: account.isCash,
            currencyId: mainCurrency.id
          }
        });
        createdAccounts[account.code] = newAccount;
        console.log(`✅ تم إنشاء حساب: ${account.name}`);
      } else {
        createdAccounts[account.code] = existingAccount;
        console.log(`⏭️  الحساب موجود بالفعل: ${account.name}`);
      }
    }

    // إنشاء العملاء وربطهم بحساب العملاء
    console.log('\n👥 إنشاء العملاء...');
    const customersAccount = createdAccounts['1200']; // حساب العملاء
    
    for (const clientData of sampleClients) {
      const existingClient = await prisma.client.findFirst({
        where: { name: clientData.name }
      });

      if (!existingClient) {
        await prisma.client.create({
          data: {
            name: clientData.name,
            phone: clientData.phone,
            type: clientData.type,
            accountId: customersAccount.id
          }
        });
        console.log(`✅ تم إنشاء عميل: ${clientData.name}`);
      } else {
        console.log(`⏭️  العميل موجود بالفعل: ${clientData.name}`);
      }
    }

    // إنشاء الموردين وربطهم بحساب الموردين
    console.log('\n🏪 إنشاء الموردين...');
    const suppliersAccount = createdAccounts['2100']; // حساب الموردين
    
    for (const supplierData of sampleSuppliers) {
      const existingSupplier = await prisma.client.findFirst({
        where: { name: supplierData.name }
      });

      if (!existingSupplier) {
        await prisma.client.create({
          data: {
            name: supplierData.name,
            phone: supplierData.phone,
            type: supplierData.type,
            accountId: suppliersAccount.id
          }
        });
        console.log(`✅ تم إنشاء مورد: ${supplierData.name}`);
      } else {
        console.log(`⏭️  المورد موجود بالفعل: ${supplierData.name}`);
      }
    }

    // إنشاء تكوينات الفواتير
    console.log('\n🔧 إعداد تكوينات الفواتير...');
    
    for (const config of invoiceConfigs) {
      const debitAccount = createdAccounts[config.debitAccountCode];
      const creditAccount = createdAccounts[config.creditAccountCode];

      if (!debitAccount || !creditAccount) {
        console.warn(`⚠️  تعذر العثور على الحسابات للتكوين: ${config.description}`);
        continue;
      }

      const existingConfig = await prisma.invoiceAccountingConfig.findFirst({
        where: {
          name: config.name
        }
      });

      if (!existingConfig) {
        await prisma.invoiceAccountingConfig.create({
          data: {
            name: config.name,
            invoiceType: config.invoiceType as any,
            paymentType: config.paymentType as any,
            debitAccountId: debitAccount.id,
            creditAccountId: creditAccount.id,
            description: config.description,
            isActive: true
          }
        });
        console.log(`✅ تم إنشاء تكوين: ${config.name}`);
      } else {
        console.log(`⏭️  التكوين موجود بالفعل: ${config.name}`);
      }
    }

    console.log('\n🎉 تم إكمال العملية بنجاح!');
    console.log('\n📊 ملخص البيانات:');
    console.log(`- الحسابات: ${chartOfAccounts.length} حساب`);
    console.log(`- العملاء: ${sampleClients.length} عميل`);
    console.log(`- الموردين: ${sampleSuppliers.length} مورد`);
    console.log(`- تكوينات الفواتير: ${invoiceConfigs.length} تكوين`);

  } catch (error) {
    console.error('❌ خطأ في إدخال البيانات:', error);
    throw error;
  }
}

// تشغيل البرنامج
seedAccounts()
  .catch((e) => {
    console.error('❌ خطأ في تشغيل البرنامج:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
