# 🌱 دليل HR Data Seeder

## 📋 نظرة عامة

Seeder جاهز لإضافة بيانات تجريبية كاملة لقسم الموارد البشرية (بدون الوثائق).

---

## 🎯 ما سيتم إضافته

### 1. الوظائف (7 وظائف)

```
💼 المدير التنفيذي (CEO)
💼 مدير الموارد البشرية (HR Manager)
💼 مطور برمجيات (Developer)
💼 مصمم جرافيك (Designer)
💼 محاسب (Accountant)
💼 موظف مبيعات (Sales)
💼 الدعم الفني (Support)
```

### 2. الموظفين (10 موظفين)

```
👤 أحمد محمد       - المدير التنفيذي
👤 سارة علي        - مدير الموارد البشرية
👤 محمود حسن       - مطور برمجيات (Senior)
👤 نور عبدالله     - مصمم جرافيك
👤 خالد إبراهيم     - محاسب
👤 مريم حسين       - موظف مبيعات
👤 عمر صالح        - مطور برمجيات
👤 ياسمين كريم     - الدعم الفني
👤 حسام طارق       - مطور برمجيات
👤 لينا فاضل       - موظف مبيعات (Part-time)
```

### 3. سجلات الحضور (~200+ سجل)

```
⏰ آخر 30 يوم
⏰ معدل حضور 90%
⏰ تباين في أوقات الدخول والخروج
⏰ دعم العمل عن بُعد (REMOTE)
```

### 4. طلبات الإجازات (6 طلبات)

```
🏖️ إجازات سنوية
🏥 إجازات مرضية
👶 إجازة أمومة
✅ بعضها معتمد (APPROVED)
⏳ بعضها قيد الانتظار (PENDING)
```

### 5. سجلات الرواتب (~30 سجل)

```
💰 آخر 3 أشهر
💰 رواتب مشفرة
💰 بعضها مدفوع، بعضها غير مدفوع
💰 مرتبطة بسجلات الحضور
```

---

## 🚀 كيفية التشغيل

### الطريقة 1: باستخدام ts-node مباشرة

```bash
cd iZeus-erp-backend
npx ts-node prisma/seed-hr.ts
```

### الطريقة 2: إضافة script في package.json

```json
{
  "scripts": {
    "seed:hr": "ts-node prisma/seed-hr.ts"
  }
}
```

ثم:

```bash
npm run seed:hr
```

### الطريقة 3: تشغيل بعد Migration

```bash
# تطبيق Migration أولاً
npx prisma migrate dev --name add_employee_documents_system

# ثم تشغيل HR Seeder
npx ts-node prisma/seed-hr.ts
```

---

## ⚠️ متطلبات مهمة

### 1. يجب تشغيل Main Seed أولاً

```bash
# تشغيل الـ seed الأساسي أولاً
npx prisma db seed

# ثم تشغيل HR seed
npx ts-node prisma/seed-hr.ts
```

**السبب:** HR seed يحتاج إلى:

- ✅ Default Workspace (iZeus-erp)
- ✅ Super Admin User (husseinnajah.it@gmail.com)

### 2. ملف utils/help.ts موجود

- يحتوي على دالة `encrypt()` لتشفير الرواتب

---

## 🔑 مفتاح التشفير

الرواتب مشفرة باستخدام:

```
Encryption Key: demo-encryption-key-2025
```

**استخدمه عند:**

- عرض الرواتب في الواجهة
- توليد كشوف الرواتب
- أي عملية تتعلق بالرواتب

---

## 📊 التفاصيل

### الموظفون مع التسلسل الإداري

```
أحمد محمد (CEO)
├── سارة علي (HR Manager)
│   └── ياسمين كريم (Support)
├── محمود حسن (Senior Developer)
│   ├── عمر صالح (Developer)
│   └── حسام طارق (Developer)
├── نور عبدالله (Designer)
├── خالد إبراهيم (Accountant)
├── مريم حسين (Sales)
└── لينا فاضل (Sales - Part-time)
```

### الرواتب الشهرية

```
المدير التنفيذي:       2,000,000 IQD
مدير HR:               1,500,000 IQD
Senior Developer:      1,200,000 IQD
محاسب:                1,300,000 IQD
Developer (حسام):      1,400,000 IQD
Developer (عمر):       1,250,000 IQD
مصمم:                 1,100,000 IQD
مبيعات (مريم):        1,000,000 IQD
دعم فني:               900,000 IQD
مبيعات Part-time:      700,000 IQD
```

### ساعات العمل

```
معظم الموظفين: 9:00 صباحاً - 5:00 مساءً
المحاسب:      8:30 صباحاً - 4:30 مساءً
Part-time:    10:00 صباحاً - 4:00 مساءً
```

### أنواع العمل

```
OFFICE:   6 موظفين
HYBRID:   2 موظفين
REMOTE:   2 موظفين
```

---

## 🧪 اختبار النتائج

### 1. عدد الموظفين

```sql
SELECT COUNT(*) FROM "Employee" WHERE "isDeleted" = false;
-- Expected: 10
```

### 2. عدد الوظائف

```sql
SELECT COUNT(*) FROM "Job" WHERE "isDeleted" = false;
-- Expected: 7
```

### 3. سجلات الحضور

```sql
SELECT COUNT(*) FROM "EmployeeAttendance" WHERE "isDeleted" = false;
-- Expected: ~200+
```

### 4. طلبات الإجازات

```sql
SELECT COUNT(*) FROM "Leave" WHERE "isDeleted" = false;
-- Expected: 6
```

### 5. سجلات الرواتب

```sql
SELECT COUNT(*) FROM "Salary" WHERE "isDeleted" = false;
-- Expected: ~30
```

---

## 🎨 استخدام البيانات في UI

### عرض الموظفين

```
http://localhost:3000/hr/employees
```

### لوحة التحكم HR

```
http://localhost:3000/hr
```

### عرض موظف محدد

```
http://localhost:3000/hr/employees/view/emp-001
```

---

## 🔧 التخصيص

### تغيير عدد الموظفين

```typescript
// في seed-hr.ts
const employeesData = [
  // أضف المزيد من الموظفين هنا
];
```

### تغيير فترة الحضور

```typescript
// تغيير من 30 يوم إلى 90 يوم
for (let i = 0; i < 90; i++) {
  // ...
}
```

### تغيير معدل الحضور

```typescript
// تغيير من 90% إلى 95%
if (Math.random() > 0.95) continue;
```

---

## 🗑️ إعادة التشغيل (Reset)

إذا أردت حذف البيانات وإعادة التشغيل:

```bash
# حذف البيانات التجريبية فقط
npx prisma studio
# ثم احذف السجلات يدوياً

# أو إعادة تعيين قاعدة البيانات بالكامل (احذر!)
npx prisma migrate reset
npx prisma db seed
npx ts-node prisma/seed-hr.ts
```

---

## 📝 الملاحظات

### ✅ الإيجابيات

- بيانات واقعية ومنطقية
- تسلسل إداري صحيح
- تباين في ساعات العمل
- رواتب مشفرة
- سجلات حضور لـ 30 يوم

### ⚠️ تذكير

- هذه بيانات تجريبية فقط
- استخدمها للتطوير والاختبار
- احذفها قبل الإنتاج
- غير أرقام الهواتف إذا استخدمت في production

---

## 🎯 الخطوة التالية

بعد تشغيل الـ seeder:

1. ✅ افتح التطبيق: `http://localhost:3000`
2. ✅ سجل دخول
3. ✅ اذهب إلى: **HR** > **Employees**
4. ✅ شاهد 10 موظفين جاهزين!
5. ✅ جرب الحضور، الإجازات، الرواتب

---

## 🔍 استكشاف الأخطاء

### خطأ: "Default workspace not found"

**الحل:** شغل main seed أولاً:

```bash
npx prisma db seed
```

### خطأ: "Super admin user not found"

**الحل:** نفس الحل أعلاه

### خطأ: "encrypt is not defined"

**الحل:** تأكد من وجود ملف `utils/help.ts` مع دالة `encrypt()`

---

## 📚 المراجع

- **Main Seed**: `prisma/seed.ts`
- **Schema**: `prisma/schema.prisma`
- **Utils**: `utils/help.ts`

---

**تم التطوير بـ ❤️ لـ iZeus ERP**

_Happy Seeding! 🌱_
