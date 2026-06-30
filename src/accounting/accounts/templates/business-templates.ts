import { AccountType } from '@prisma/client';

export interface AccountTemplate {
  code: string;
  name: string;
  type: AccountType;
  isCash: boolean;
  description?: string;
}

export interface BusinessTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  accounts: AccountTemplate[];
  invoiceConfigs?: {
    salesCash: { debitCode: string; creditCode: string };
    salesCredit: { debitCode: string; creditCode: string };
    purchaseCash: { debitCode: string; creditCode: string };
    purchaseCredit: { debitCode: string; creditCode: string };
  };
}

// 🏪 قالب محل تجاري عام
const retailStoreTemplate: BusinessTemplate = {
  id: 'retail-store',
  name: 'محل تجاري',
  nameEn: 'Retail Store',
  description: 'قالب شامل للمحلات التجارية وبيع التجزئة',
  icon: '🏪',
  accounts: [
    // الأصول
    {
      code: '1100',
      name: 'الصندوق',
      type: AccountType.ASSET,
      isCash: true,
      description: 'النقدية في المحل',
    },
    {
      code: '1110',
      name: 'البنك',
      type: AccountType.ASSET,
      isCash: true,
      description: 'الحساب البنكي',
    },
    {
      code: '1200',
      name: 'العملاء',
      type: AccountType.ASSET,
      isCash: false,
      description: 'المبيعات الآجلة',
    },
    {
      code: '1300',
      name: 'المخزون',
      type: AccountType.ASSET,
      isCash: false,
      description: 'بضاعة للبيع',
    },
    {
      code: '1400',
      name: 'الإيجار المدفوع مقدماً',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'الديكور والتجهيزات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أجهزة نقاط البيع',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'الموردون',
      type: AccountType.LIABILITY,
      isCash: false,
      description: 'المشتريات الآجلة',
    },
    {
      code: '2200',
      name: 'الإيجار المستحق',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'الرواتب المستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات المبيعات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'خصومات مسموحة',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة البضاعة المباعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الموظفين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المحل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فاتورة الكهرباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'مصاريف الإعلان',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'مصاريف الصيانة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// ☕ قالب مقهى
const cafeTemplate: BusinessTemplate = {
  id: 'cafe',
  name: 'مقهى',
  nameEn: 'Cafe',
  description: 'قالب مخصص للمقاهي والكافيهات',
  icon: '☕',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون القهوة والمواد',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون الحلويات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'آلات القهوة والمعدات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'الطاولات والكراسي',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'الديكور الداخلي',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو القهوة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'موردو الحلويات',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'الإيجار المستحق',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'رواتب الباريستا',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات المشروبات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات الطعام',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'إيرادات الحلويات',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة القهوة والمواد',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة الحلويات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الباريستا',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المقهى',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء والماء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'تنظيف وصيانة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'موسيقى وترفيه',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🛒 قالب متجر إلكتروني
const ecommerceTemplate: BusinessTemplate = {
  id: 'ecommerce',
  name: 'متجر إلكتروني',
  nameEn: 'E-commerce Store',
  description: 'قالب للمتاجر الإلكترونية والتجارة الرقمية',
  icon: '🛒',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1120',
      name: 'بوابات الدفع الإلكتروني',
      type: AccountType.ASSET,
      isCash: true,
    },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    { code: '1300', name: 'المخزون', type: AccountType.ASSET, isCash: false },
    {
      code: '1500',
      name: 'أجهزة الكمبيوتر',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'برامج المتجر',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'الموردون',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'منصات التجارة الإلكترونية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'رواتب المطورين',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات المبيعات الإلكترونية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'مردودات المبيعات',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة البضاعة المباعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الفريق',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'استضافة الموقع',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'رسوم بوابات الدفع',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'إعلانات رقمية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'رسوم الشحن',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'دعم العملاء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1120', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🍔 قالب مطعم
const restaurantTemplate: BusinessTemplate = {
  id: 'restaurant',
  name: 'مطعم',
  nameEn: 'Restaurant',
  description: 'قالب للمطاعم وخدمات الطعام',
  icon: '🍔',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون المواد الغذائية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون المشروبات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات المطبخ',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'طاولات وكراسي',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو المواد الغذائية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'الإيجار المستحق',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'رواتب الطهاة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2310',
      name: 'رواتب الخدمة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات الطعام',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات المشروبات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'رسوم الخدمة',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة المواد الغذائية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة المشروبات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الطهاة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب الخدمة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المطعم',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الغاز والكهرباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'تنظيف وصحة عامة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🏥 قالب عيادة طبية
const clinicTemplate: BusinessTemplate = {
  id: 'clinic',
  name: 'عيادة طبية',
  nameEn: 'Medical Clinic',
  description: 'قالب للعيادات والمراكز الطبية',
  icon: '🏥',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1200',
      name: 'المرضى (حسابات مدينة)',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون الأدوية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'المواد الطبية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'الأجهزة الطبية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أثاث العيادة',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الأدوية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الأطباء',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'رواتب التمريض',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'تأمينات طبية مستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات الكشف الطبي',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات الأدوية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'إيرادات التحاليل',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الأدوية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة المواد الطبية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الأطباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب التمريض',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار العيادة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'صيانة الأجهزة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'تأمين طبي',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🚗 قالب ورشة سيارات
const autoShopTemplate: BusinessTemplate = {
  id: 'auto-shop',
  name: 'ورشة سيارات',
  nameEn: 'Auto Repair Shop',
  description: 'قالب لورش إصلاح وصيانة السيارات',
  icon: '🚗',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون قطع الغيار',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون الزيوت والسوائل',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات الورشة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أدوات الإصلاح',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو قطع الغيار',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الميكانيكيين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'إيجار الورشة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات الإصلاح',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات قطع الغيار',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'إيرادات الصيانة',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة قطع الغيار',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة الزيوت والسوائل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الميكانيكيين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار الورشة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'صيانة المعدات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 💇 قالب صالون تجميل
const beautyTemplate: BusinessTemplate = {
  id: 'beauty-salon',
  name: 'صالون تجميل',
  nameEn: 'Beauty Salon',
  description: 'قالب لصالونات التجميل والعناية',
  icon: '💇',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون مستحضرات التجميل',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون أدوات التجميل',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات الصالون',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'الديكور والإضاءة',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو مستحضرات التجميل',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المصففين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'إيجار الصالون',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات قص الشعر',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات التجميل',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'إيرادات العناية بالبشرة',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة مستحضرات التجميل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة أدوات التجميل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب المصففين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار الصالون',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء والماء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'مواد التنظيف',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 💎 قالب محل مجوهرات
const jewelryStoreTemplate: BusinessTemplate = {
  id: 'jewelry-store',
  name: 'محل مجوهرات',
  nameEn: 'Jewelry Store',
  description: 'قالب متخصص لمحلات المجوهرات والذهب والألماس',
  icon: '💎',
  accounts: [
    // الأصول
    {
      code: '1100',
      name: 'الصندوق',
      type: AccountType.ASSET,
      isCash: true,
      description: 'النقدية في المحل',
    },
    {
      code: '1110',
      name: 'البنك',
      type: AccountType.ASSET,
      isCash: true,
      description: 'الحساب البنكي',
    },
    {
      code: '1120',
      name: 'خزينة المحل',
      type: AccountType.ASSET,
      isCash: true,
      description: 'الخزينة الآمنة للنقد والمجوهرات',
    },
    {
      code: '1200',
      name: 'العملاء',
      type: AccountType.ASSET,
      isCash: false,
      description: 'مبيعات آجلة',
    },
    {
      code: '1300',
      name: 'مخزون الذهب',
      type: AccountType.ASSET,
      isCash: false,
      description: 'الذهب بأنواعه',
    },
    {
      code: '1310',
      name: 'مخزون الألماس',
      type: AccountType.ASSET,
      isCash: false,
      description: 'الألماس والأحجار الكريمة',
    },
    {
      code: '1320',
      name: 'مخزون الفضة',
      type: AccountType.ASSET,
      isCash: false,
      description: 'الفضة والمعادن الأخرى',
    },
    {
      code: '1330',
      name: 'مخزون الساعات',
      type: AccountType.ASSET,
      isCash: false,
      description: 'الساعات الثمينة',
    },
    {
      code: '1500',
      name: 'أجهزة الكشف والوزن',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'خزائن العرض',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'نظام المراقبة والأمن',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الذهب',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'موردو الألماس',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'الإيجار المستحق',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'رواتب الموظفين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'أقساط الذهب المستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات مبيعات الذهب',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات مبيعات الألماس',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات مبيعات الفضة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات مبيعات الساعات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4200',
      name: 'إيرادات الصياغة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4300',
      name: 'إيرادات الإصلاح',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الذهب المباع',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة الألماس المباع',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5120',
      name: 'تكلفة الفضة المباعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الصاغة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب البائعين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المحل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'مصاريف الأمن والحراسة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'التأمين على المجوهرات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'رسوم الدمغة والضرائب',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 💻 قالب شركة تقنية
const techCompanyTemplate: BusinessTemplate = {
  id: 'tech-company',
  name: 'شركة تقنية',
  nameEn: 'Tech Company',
  description: 'قالب لشركات البرمجيات وتطوير التطبيقات والخدمات التقنية',
  icon: '💻',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1120',
      name: 'حسابات الدفع الإلكتروني',
      type: AccountType.ASSET,
      isCash: true,
    },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'عقود قيد التنفيذ',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مصاريف مدفوعة مقدماً',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'أجهزة الكمبيوتر والخوادم',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'البرمجيات والتراخيص',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'حقوق الملكية الفكرية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'أثاث المكتب',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'الموردون',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المطورين المستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'مكافآت المستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'إيرادات مؤجلة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'ضرائب مستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3300',
      name: 'احتياطي التطوير',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات تطوير البرمجيات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات التطبيقات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات الاستشارات التقنية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات الصيانة والدعم',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات الاستضافة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4150',
      name: 'إيرادات التراخيص',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'رواتب المطورين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'رواتب المصممين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5120',
      name: 'رواتب فريق الدعم',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'خدمات سحابية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'تراخيص البرمجيات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المكتب',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'مصاريف الإنترنت',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'التدريب والتطوير',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'التسويق الرقمي',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'مصاريف البحث والتطوير',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5200', creditCode: '1100' },
    purchaseCredit: { debitCode: '5200', creditCode: '2100' },
  },
};

// 🏗️ قالب شركة مقاولات
const constructionTemplate: BusinessTemplate = {
  id: 'construction-company',
  name: 'شركة مقاولات',
  nameEn: 'Construction Company',
  description: 'قالب لشركات المقاولات والبناء والتشييد',
  icon: '🏗️',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'مستخلصات تحت التحصيل',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1220',
      name: 'محجوز ضمان',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون مواد البناء',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون الحديد والأسمنت',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1400',
      name: 'مشاريع تحت التنفيذ',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات ثقيلة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'سيارات نقل',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات وأدوات',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو مواد البناء',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'مقاولو الباطن',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المهندسين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'أجور العمال',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'دفعات مقدمة من العملاء',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'تأمينات اجتماعية',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3300',
      name: 'احتياطي المشاريع',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات المقاولات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات أعمال البناء',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات التشطيبات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات الصيانة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات الاستشارات الهندسية',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة مواد البناء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة الحديد والأسمنت',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5120',
      name: 'تكلفة مقاولي الباطن',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب المهندسين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'أجور العمال',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المعدات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'وقود ونقل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'صيانة المعدات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'تأمينات المشاريع',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'رخص البناء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🏥 قالب مستشفى
const hospitalTemplate: BusinessTemplate = {
  id: 'hospital',
  name: 'مستشفى',
  nameEn: 'Hospital',
  description: 'قالب شامل للمستشفيات والمراكز الطبية الكبرى',
  icon: '🏥',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1120', name: 'نقاط البيع', type: AccountType.ASSET, isCash: true },
    {
      code: '1200',
      name: 'المرضى المدينون',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1210',
      name: 'شركات التأمين المدينة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون الأدوية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون المستلزمات الطبية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1320',
      name: 'مخزون المواد الاستهلاكية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'الأجهزة الطبية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أجهزة الأشعة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات غرف العمليات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'أسرّة المستشفى',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1540',
      name: 'سيارات الإسعاف',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1550',
      name: 'مباني المستشفى',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الأدوية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'موردو المعدات الطبية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الأطباء',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'رواتب التمريض',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2220',
      name: 'رواتب الإداريين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'مستحقات شركات التأمين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'ودائع المرضى',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3300',
      name: 'احتياطي التطوير الطبي',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات العيادات الخارجية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات الإقامة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات العمليات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات الطوارئ',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات المختبر',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4150',
      name: 'إيرادات الأشعة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4160',
      name: 'إيرادات الصيدلية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4170',
      name: 'إيرادات العناية المركزة',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الأدوية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة المستلزمات الطبية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الأطباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب التمريض',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5220',
      name: 'رواتب الفنيين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5230',
      name: 'رواتب الإداريين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'صيانة الأجهزة الطبية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء والماء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'التنظيف والتعقيم',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'التأمين الطبي',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'التدريب الطبي',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5800',
      name: 'وجبات المرضى',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🏨 قالب فندق
const hotelTemplate: BusinessTemplate = {
  id: 'hotel',
  name: 'فندق',
  nameEn: 'Hotel',
  description: 'قالب للفنادق والمنتجعات السياحية',
  icon: '🏨',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1120', name: 'نقاط البيع', type: AccountType.ASSET, isCash: true },
    {
      code: '1200',
      name: 'النزلاء المدينون',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1210',
      name: 'شركات السياحة المدينة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون الأغذية والمشروبات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون مستلزمات الغرف',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1320',
      name: 'مخزون مواد التنظيف',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1400',
      name: 'حجوزات مدفوعة مقدماً',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'مبنى الفندق',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أثاث الغرف',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات المطابخ',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'معدات المسابح والنادي',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1540',
      name: 'سيارات الفندق',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الأغذية والمشروبات',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'موردو مستلزمات الفندق',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الموظفين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'ودائع النزلاء',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'حجوزات مقدمة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2500',
      name: 'عمولات وكلاء السياحة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3300',
      name: 'احتياطي التطوير',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات الغرف',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات الأجنحة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات المطاعم',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات قاعات الاجتماعات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات المسبح والنادي',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4150',
      name: 'إيرادات خدمة الغرف',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4160',
      name: 'إيرادات المغسلة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4170',
      name: 'إيرادات موقف السيارات',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الأغذية والمشروبات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة مستلزمات الغرف',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الاستقبال',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب خدمات الغرف',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5220',
      name: 'رواتب المطبخ',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5230',
      name: 'رواتب الأمن',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'فواتير الكهرباء والماء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'صيانة المبنى',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'التنظيف والغسيل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'التسويق والإعلان',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'عمولات الحجوزات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    { code: '5800', name: 'التأمين', type: AccountType.EXPENSE, isCash: false },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// ✈️ قالب شركة سياحة وسفر
const travelAgencyTemplate: BusinessTemplate = {
  id: 'travel-agency',
  name: 'شركة سياحة وسفر',
  nameEn: 'Travel Agency',
  description: 'قالب لشركات السياحة والسفر ووكالات السفر',
  icon: '✈️',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1120',
      name: 'حسابات شركات الطيران',
      type: AccountType.ASSET,
      isCash: true,
    },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'عمولات مستحقة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مصاريف مدفوعة مقدماً',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'أجهزة الكمبيوتر',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أثاث المكتب',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'شركات الطيران الدائنة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'الفنادق الدائنة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الموظفين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'حجوزات مدفوعة مقدماً',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'تأمينات السفر المستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'عمولات التذاكر',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'عمولات حجوزات الفنادق',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات البرامج السياحية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'رسوم الخدمة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات التأشيرات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4150',
      name: 'إيرادات التأمين السفر',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة التذاكر',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'تكلفة حجوزات الفنادق',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الموظفين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المكتب',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'مصاريف التسويق',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'عمولات المندوبين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'رسوم الأنظمة والحجوزات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 📊 قالب شركة ماركتنج
const marketingTemplate: BusinessTemplate = {
  id: 'marketing-agency',
  name: 'شركة ماركتنج',
  nameEn: 'Marketing Agency',
  description: 'قالب لشركات التسويق والإعلان الرقمي',
  icon: '📊',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'مشاريع قيد التنفيذ',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'أجهزة الكمبيوتر',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'برامج التصميم',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات التصوير',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الخدمات',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الفريق الإبداعي',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'مصاريف إعلانية مستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات الحملات الإعلانية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات إدارة وسائل التواصل',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات التصميم',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات الاستشارات التسويقية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات إنتاج المحتوى',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الإعلانات المدفوعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب المصممين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب المسوقين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5220',
      name: 'رواتب كتاب المحتوى',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'اشتراكات الأدوات التسويقية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'مصاريف الإنتاج',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🚚 قالب شركة دعم لوجستي
const logisticsTemplate: BusinessTemplate = {
  id: 'logistics-company',
  name: 'شركة دعم لوجستي',
  nameEn: 'Logistics Company',
  description: 'قالب لشركات النقل والشحن والخدمات اللوجستية',
  icon: '🚚',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون قطع الغيار',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون الوقود',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'أسطول الشاحنات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'معدات المناولة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'المستودعات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'أنظمة التتبع',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو الوقود',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'شركات النقل الفرعية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب السائقين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'أقساط الشاحنات',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'تأمينات البضائع',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات النقل المحلي',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات النقل الدولي',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات التخزين',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات التوزيع',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات التخليص الجمركي',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة الوقود',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'صيانة الشاحنات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب السائقين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب عمال المستودعات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المستودعات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'رسوم الطرق والعبور',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'التأمين على الشاحنات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'رسوم جمركية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🔬 قالب شركة فحوصات هندسية
const engineeringInspectionTemplate: BusinessTemplate = {
  id: 'engineering-inspection',
  name: 'شركة فحوصات هندسية',
  nameEn: 'Engineering Inspection Company',
  description: 'قالب لشركات الفحص الهندسي والاستشارات الفنية',
  icon: '🔬',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'مشاريع قيد الفحص',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مواد الفحص والاختبار',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات الفحص',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أجهزة القياس',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات المختبر',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'سيارات الفحص الميداني',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو معدات الفحص',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المهندسين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'رواتب الفنيين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'مصاريف معايرة مستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'إيرادات فحص المواد',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'إيرادات فحص التربة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات فحص الخرسانة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'إيرادات الاستشارات الهندسية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات إصدار الشهادات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4150',
      name: 'إيرادات التدريب الفني',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة مواد الفحص',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب المهندسين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5210',
      name: 'رواتب الفنيين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'صيانة معدات الفحص',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'معايرة الأجهزة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'إيجار المختبر',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'التأمين المهني',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5700',
      name: 'التدريب والشهادات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🏢 قالب شركة عقارات
const realEstateTemplate: BusinessTemplate = {
  id: 'real-estate',
  name: 'شركة عقارات',
  nameEn: 'Real Estate Company',
  description: 'قالب لشركات العقارات والوساطة العقارية',
  icon: '🏢',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1210',
      name: 'عمولات مستحقة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'عقارات للبيع',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'عقارات للإيجار',
      type: AccountType.ASSET,
      isCash: false,
    },
    { code: '1320', name: 'أراضي', type: AccountType.ASSET, isCash: false },
    { code: '1500', name: 'سيارات', type: AccountType.ASSET, isCash: false },
    {
      code: '1510',
      name: 'أثاث المكتب',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'ودائع المستأجرين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الموظفين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'عمولات وكلاء مستحقة',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2400',
      name: 'قروض عقارية',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'عمولات البيع',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'عمولات الإيجار',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'إيرادات إدارة العقارات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'أرباح بيع العقارات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات الإيجارات',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'عمولات الوكلاء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الموظفين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المكتب',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'مصاريف التسويق العقاري',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'صيانة العقارات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'رسوم قانونية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🎓 قالب مدرسة خاصة
const privateSchoolTemplate: BusinessTemplate = {
  id: 'private-school',
  name: 'مدرسة خاصة',
  nameEn: 'Private School',
  description: 'قالب للمدارس الخاصة والمؤسسات التعليمية',
  icon: '🎓',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1200',
      name: 'رسوم مستحقة من الطلاب',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون الكتب',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون القرطاسية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'مباني المدرسة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أثاث الفصول',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'معدات المختبرات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1530',
      name: 'حافلات المدرسة',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'رسوم مدفوعة مقدماً',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المعلمين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2210',
      name: 'رواتب الإداريين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'موردو الكتب',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'الرسوم الدراسية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'رسوم النقل',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'رسوم الأنشطة',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'رسوم الكتب',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'إيرادات المقصف',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'رواتب المعلمين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5110',
      name: 'رواتب الإداريين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'تكلفة الكتب',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'صيانة المباني',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الخدمات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'مصاريف النقل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5600',
      name: 'الأنشطة المدرسية',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5200', creditCode: '1100' },
    purchaseCredit: { debitCode: '5200', creditCode: '2100' },
  },
};

// 🏋️ قالب نادي رياضي
const gymTemplate: BusinessTemplate = {
  id: 'gym-fitness',
  name: 'نادي رياضي',
  nameEn: 'Gym & Fitness Center',
  description: 'قالب للنوادي الرياضية ومراكز اللياقة البدنية',
  icon: '🏋️',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    {
      code: '1200',
      name: 'اشتراكات مستحقة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1300',
      name: 'مخزون المكملات الغذائية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون الملابس الرياضية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'معدات رياضية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'أجهزة القوة',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'أجهزة الكارديو',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'اشتراكات مدفوعة مقدماً',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب المدربين',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2300',
      name: 'موردو المعدات',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'اشتراكات شهرية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'اشتراكات سنوية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'جلسات تدريب شخصي',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'مبيعات المكملات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4140',
      name: 'برامج غذائية',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'رواتب المدربين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'إيجار النادي',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'صيانة المعدات',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'مواد التنظيف',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

// 🛍️ قالب سوبر ماركت
const supermarketTemplate: BusinessTemplate = {
  id: 'supermarket',
  name: 'سوبر ماركت',
  nameEn: 'Supermarket',
  description: 'قالب للسوبر ماركت ومحلات البقالة الكبرى',
  icon: '🛍️',
  accounts: [
    // الأصول
    { code: '1100', name: 'الصندوق', type: AccountType.ASSET, isCash: true },
    { code: '1110', name: 'البنك', type: AccountType.ASSET, isCash: true },
    { code: '1120', name: 'نقاط البيع', type: AccountType.ASSET, isCash: true },
    { code: '1200', name: 'العملاء', type: AccountType.ASSET, isCash: false },
    {
      code: '1300',
      name: 'مخزون المواد الغذائية',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1310',
      name: 'مخزون المشروبات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1320',
      name: 'مخزون مواد التنظيف',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1330',
      name: 'مخزون اللحوم والدواجن',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1500',
      name: 'ثلاجات ومبردات',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1510',
      name: 'رفوف العرض',
      type: AccountType.ASSET,
      isCash: false,
    },
    {
      code: '1520',
      name: 'عربات التسوق',
      type: AccountType.ASSET,
      isCash: false,
    },

    // الخصوم
    {
      code: '2100',
      name: 'موردو المواد الغذائية',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2110',
      name: 'موردو المشروبات',
      type: AccountType.LIABILITY,
      isCash: false,
    },
    {
      code: '2200',
      name: 'رواتب الموظفين',
      type: AccountType.LIABILITY,
      isCash: false,
    },

    // حقوق الملكية
    {
      code: '3100',
      name: 'رأس المال',
      type: AccountType.EQUITY,
      isCash: false,
    },
    {
      code: '3200',
      name: 'الأرباح المحتجزة',
      type: AccountType.EQUITY,
      isCash: false,
    },

    // الإيرادات
    {
      code: '4100',
      name: 'مبيعات المواد الغذائية',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4110',
      name: 'مبيعات المشروبات',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4120',
      name: 'مبيعات اللحوم',
      type: AccountType.REVENUE,
      isCash: false,
    },
    {
      code: '4130',
      name: 'مبيعات الخضروات والفواكه',
      type: AccountType.REVENUE,
      isCash: false,
    },

    // المصروفات
    {
      code: '5100',
      name: 'تكلفة البضاعة المباعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5200',
      name: 'رواتب الموظفين',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5300',
      name: 'إيجار المحل',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5400',
      name: 'فواتير الكهرباء',
      type: AccountType.EXPENSE,
      isCash: false,
    },
    {
      code: '5500',
      name: 'هالك البضاعة',
      type: AccountType.EXPENSE,
      isCash: false,
    },
  ],
  invoiceConfigs: {
    salesCash: { debitCode: '1100', creditCode: '4100' },
    salesCredit: { debitCode: '1200', creditCode: '4100' },
    purchaseCash: { debitCode: '5100', creditCode: '1100' },
    purchaseCredit: { debitCode: '5100', creditCode: '2100' },
  },
};

export const businessTemplates: BusinessTemplate[] = [
  retailStoreTemplate,
  cafeTemplate,
  ecommerceTemplate,
  restaurantTemplate,
  clinicTemplate,
  autoShopTemplate,
  beautyTemplate,
  jewelryStoreTemplate,
  techCompanyTemplate,
  constructionTemplate,
  hospitalTemplate,
  hotelTemplate,
  travelAgencyTemplate,
  marketingTemplate,
  logisticsTemplate,
  engineeringInspectionTemplate,
  realEstateTemplate,
  privateSchoolTemplate,
  gymTemplate,
  supermarketTemplate,
];

export const getTemplateById = (id: string): BusinessTemplate | undefined => {
  return businessTemplates.find((template) => template.id === id);
};

export const getTemplatesByCategory = (
  category: string,
): BusinessTemplate[] => {
  // يمكن تطوير هذا لاحقاً لتصنيف القوالب
  return businessTemplates;
};
