# نظام الحسابات المحاسبية - DevHouse ERP

## نظرة عامة

يوفر هذا النظام إدارة شاملة للحسابات المحاسبية وفقاً لمبدأ القيد المزدوج، مع دعم العملات المتعددة والتكامل التلقائي مع الفواتير.

## الميزات الرئيسية

- ✅ شجرة حسابات متكاملة تشمل جميع أنواع الحسابات
- ✅ دعم العملات المتعددة
- ✅ حساب الأرصدة تلقائياً وفق القيد المزدوج
- ✅ استيراد مجمع للحسابات
- ✅ ربط تلقائي مع الفواتير
- ✅ تقارير مالية شاملة

## أنواع الحسابات المدعومة

```typescript
enum AccountType {
  ASSET      // الأصول
  LIABILITY  // الخصوم
  EQUITY     // حقوق الملكية
  REVENUE    // الإيرادات
  EXPENSE    // المصروفات
}
```

## استخدام API

### 1. عرض جميع الحسابات
```http
GET /accounting/accounts

# مع فلترة حسب النوع
GET /accounting/accounts?type=ASSET

# عرض الحسابات النقدية فقط
GET /accounting/accounts?isCash=true
```

### 2. إنشاء حساب جديد
```http
POST /accounting/accounts
Content-Type: application/json

{
  "name": "1150 - حساب بنك جديد",
  "type": "ASSET",
  "isCash": true,
  "currencyId": 1
}
```

### 3. استيراد حسابات متعددة
```http
POST /accounting/accounts/import
Content-Type: application/json

{
  "skipExisting": true,
  "accounts": [
    {
      "code": "1100",
      "name": "الصندوق",
      "type": "ASSET",
      "isCash": true
    },
    {
      "code": "1200",
      "name": "العملاء",
      "type": "ASSET",
      "isCash": false
    }
  ]
}
```

الاستجابة:
```json
{
  "created": 2,
  "skipped": 0,
  "failed": 0,
  "errors": [],
  "accounts": [
    {
      "id": 1,
      "name": "1100 - الصندوق",
      "type": "ASSET",
      "code": "1100"
    },
    {
      "id": 2,
      "name": "1200 - العملاء",
      "type": "ASSET",
      "code": "1200"
    }
  ]
}
```

### 4. عرض ملخص الحسابات
```http
GET /accounting/accounts/summary
```

### 5. عرض الحسابات النقدية
```http
GET /accounting/accounts/cash
```

### 6. عرض معاملات حساب معين
```http
GET /accounting/accounts/:id/transactions
```

## إدخال البيانات الأولية

### باستخدام السكريبت
```bash
# إدخال شجرة الحسابات الكاملة
npm run seed:accounts
```

### باستخدام ملف JSON
```bash
curl -X POST http://localhost:3000/accounting/accounts/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @examples/import-accounts.example.json
```

## التكامل مع الفواتير

يتم ربط الحسابات تلقائياً مع الفواتير من خلال تكوينات الفواتير:

### فواتير المبيعات
- **نقدي**: من حـ/ الصندوق إلى حـ/ إيرادات المبيعات
- **آجل**: من حـ/ العملاء إلى حـ/ إيرادات المبيعات

### فواتير المشتريات
- **نقدي**: من حـ/ تكلفة البضاعة المباعة إلى حـ/ الصندوق
- **آجل**: من حـ/ تكلفة البضاعة المباعة إلى حـ/ الموردون

## القواعد المحاسبية

### طبيعة الحسابات
- **الأصول والمصروفات**: طبيعتها مدينة (تزداد بالمدين، تقل بالدائن)
- **الخصوم وحقوق الملكية والإيرادات**: طبيعتها دائنة (تزداد بالدائن، تقل بالمدين)

### حساب الرصيد
```typescript
// للأصول والمصروفات
balance = totalDebit - totalCredit

// للخصوم وحقوق الملكية والإيرادات
balance = totalCredit - totalDebit
```

## أمثلة القيود المحاسبية

### 1. شراء بضاعة نقداً (1000 دينار)
```
من حـ/ المشتريات (5100)     1000
  إلى حـ/ الصندوق (1100)          1000
```

### 2. بيع بضاعة آجل (1500 دينار)
```
من حـ/ العملاء (1200)        1500
  إلى حـ/ المبيعات (4100)         1500
```

### 3. سداد رواتب (5000 دينار)
```
من حـ/ الرواتب والأجور (5200) 5000
  إلى حـ/ الصندوق (1100)           5000
```

## الأمان والصلاحيات

يتطلب الوصول للحسابات الصلاحيات التالية:
- `accounts:read` - عرض الحسابات
- `accounts:create` - إنشاء حسابات جديدة
- `accounts:update` - تعديل الحسابات
- `accounts:delete` - حذف الحسابات

## استكشاف الأخطاء

### خطأ: "لم يتم العثور على العملة الرئيسية"
**الحل**: تأكد من وجود عملة رئيسية في النظام:
```sql
INSERT INTO currencies (name, code, symbol, rate, "isMain", "decimalPlaces")
VALUES ('الدينار العراقي', 'IQD', 'د.ع', 1.0, true, 0);
```

### خطأ: "الحساب موجود بالفعل"
**الحل**: استخدم `skipExisting: true` عند الاستيراد لتخطي الحسابات الموجودة

### خطأ: "لا يمكن حذف حساب مرتبط بمعاملات"
**الحل**: لا يمكن حذف الحسابات المستخدمة. استخدم الحذف الناعم بدلاً من ذلك.

## المراجع

- [دليل شجرة الحسابات الكامل](../CHART_OF_ACCOUNTS_GUIDE.md)
- [نظام تكوين الفواتير](../invoice-configs/README.md)
- [مثال استيراد الحسابات](examples/import-accounts.example.json)
