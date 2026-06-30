# 📄 نظام وثائق الموظفين - Employee Documents System

## 🎉 نظرة عامة

نظام متكامل لإدارة وثائق الموظفين في iZeus ERP. يوفر إمكانيات رفع، تخزين، وإدارة جميع المستندات المتعلقة بالموظفين مع تنبيهات ذكية لانتهاء الصلاحية.

---

## 🏗️ البنية التقنية

```
employee-documents/
├── dto/
│   ├── create-employee-document.dto.ts  # DTO لإنشاء وثيقة جديدة
│   ├── update-employee-document.dto.ts  # DTO لتحديث الوثيقة
│   ├── get-employee-documents.dto.ts    # DTO للبحث والتصفية
│   └── index.ts
├── employee-documents.service.ts         # منطق العمل الأساسي
├── employee-documents.controller.ts      # REST API endpoints
├── employee-documents.module.ts          # NestJS Module
├── index.ts                              # التصدير الرئيسي
├── EMPLOYEE_DOCUMENTS_GUIDE.md          # دليل شامل
└── README.md                            # هذا الملف
```

---

## ✨ المميزات

### 🎯 الميزات الأساسية

- ✅ رفع الملفات مباشرة على Cloudflare R2
- ✅ دعم 18 نوع مختلف من الوثائق
- ✅ إدارة تواريخ الإصدار والانتهاء
- ✅ تنبيهات للوثائق المنتهية أو القريبة من الانتهاء
- ✅ بحث وتصفية متقدمة
- ✅ إحصائيات شاملة

### 🔒 الأمان

- ✅ حماية جميع الـ endpoints بـ Authentication
- ✅ حد أقصى لحجم الملف (10MB)
- ✅ تحديد أنواع الملفات المسموحة
- ✅ Soft delete للحفاظ على البيانات

### 📊 التقارير والإحصائيات

- ✅ عدد الوثائق الإجمالي
- ✅ حجم الملفات الكلي
- ✅ توزيع الوثائق حسب النوع
- ✅ قائمة الوثائق المنتهية
- ✅ قائمة الوثائق القريبة من الانتهاء

---

## 📦 أنواع الوثائق المدعومة

| النوع                | الوصف            | مثال                            |
| -------------------- | ---------------- | ------------------------------- |
| `CONTRACT`           | عقد العمل        | عقد توظيف، تجديد عقد            |
| `ID_COPY`            | نسخة الهوية      | البطاقة المدنية، الهوية الشخصية |
| `PASSPORT`           | جواز السفر       | جواز السفر، تجديد الجواز        |
| `CERTIFICATE`        | الشهادات العلمية | البكالوريوس، الماجستير، الدورات |
| `RESUME`             | السيرة الذاتية   | CV باللغتين                     |
| `MEDICAL_REPORT`     | التقارير الطبية  | الفحص الطبي، تقارير اللياقة     |
| `INSURANCE`          | التأمين          | التأمين الصحي، تأمين الحياة     |
| `WORK_PERMIT`        | تصريح العمل      | تصريح العمل للأجانب             |
| `VISA`               | تأشيرة           | تأشيرة الإقامة، تأشيرة العمل    |
| `DRIVING_LICENSE`    | رخصة القيادة     | رخصة القيادة الوطنية            |
| `BANK_DETAILS`       | البيانات البنكية | بيانات الحساب البنكي            |
| `TAX_DOCUMENTS`      | الوثائق الضريبية | البطاقة الضريبية                |
| `POLICE_CLEARANCE`   | شهادة حسن السيرة | شهادة عدم المحكومية             |
| `REFERENCE_LETTER`   | خطاب التوصية     | توصيات من جهات سابقة            |
| `PERFORMANCE_REVIEW` | تقييم الأداء     | تقييم سنوي، تقييم ربع سنوي      |
| `WARNING_LETTER`     | خطاب إنذار       | إنذار كتابي                     |
| `APPRECIATION`       | خطاب شكر وتقدير  | شهادات التقدير                  |
| `OTHER`              | أخرى             | أي نوع آخر                      |

---

## 🚀 البدء السريع

### 1. رفع وثيقة

```bash
curl -X POST http://localhost:3000/hr/employee-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@contract.pdf" \
  -F "employeeId=emp-123" \
  -F "type=CONTRACT" \
  -F "title=عقد العمل 2025" \
  -F "expiryDate=2026-01-01"
```

### 2. الحصول على وثائق موظف

```bash
curl http://localhost:3000/hr/employee-documents/employee/emp-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. فحص الوثائق المنتهية

```bash
curl http://localhost:3000/hr/employee-documents/expired \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔗 الربط مع HR Module

النظام مدمج بشكل كامل مع HR Module:

```typescript
// في hr.module.ts
imports: [
  // ... other modules
  EmployeeDocumentsModule,
];
```

---

## 📖 التوثيق الكامل

للحصول على التوثيق الكامل مع الأمثلة والـ use cases:
👉 راجع ملف [`EMPLOYEE_DOCUMENTS_GUIDE.md`](./EMPLOYEE_DOCUMENTS_GUIDE.md)

---

## 🔧 الإعداد والتثبيت

راجع ملف [`EMPLOYEE_DOCUMENTS_MIGRATION.md`](../../EMPLOYEE_DOCUMENTS_MIGRATION.md) في الجذر الرئيسي للـ backend.

---

## 🎯 حالات الاستخدام الشائعة

### 1. رفع عقود العمل

```typescript
// عند توظيف موظف جديد
await uploadDocument({
  type: 'CONTRACT',
  title: 'عقد عمل - أحمد محمد',
  employeeId: employee.id,
  issueDate: '2025-01-01',
  expiryDate: '2026-01-01',
});
```

### 2. تتبع انتهاء الجوازات والتأشيرات

```typescript
// Cron Job يومي
const expiring = await getExpiringDocuments({ daysBeforeExpiry: 30 });
// إرسال تنبيهات
```

### 3. أرشفة الشهادات والدورات

```typescript
await uploadDocument({
  type: 'CERTIFICATE',
  title: 'شهادة دورة NestJS',
  employeeId: employee.id,
  issueDate: '2025-01-15',
  // لا يوجد expiryDate - الشهادات لا تنتهي
});
```

---

## 🤝 المساهمة

للمساهمة في تطوير هذا النظام:

1. افتح issue للميزة أو المشكلة
2. انشئ branch جديد
3. اكتب الكود مع tests
4. افتح Pull Request

---

## 📝 الترخيص

جزء من iZeus ERP System - جميع الحقوق محفوظة

---

## 📞 الدعم

للمساعدة أو الاستفسارات، تواصل مع فريق التطوير.

---

**صُنع بـ ❤️ من أجل iZeus ERP**
