# 📄 دليل نظام وثائق الموظفين - Employee Documents System

## 🎯 نظرة عامة

نظام متكامل لإدارة وثائق ومستندات الموظفين مع دعم الرفع المباشر على Cloudflare R2 والتنبيهات الذكية لانتهاء الصلاحية.

---

## 📋 أنواع الوثائق المدعومة

```typescript
enum DocumentType {
  CONTRACT           // عقد العمل
  ID_COPY            // نسخة الهوية
  PASSPORT           // جواز السفر
  CERTIFICATE        // الشهادات العلمية
  RESUME             // السيرة الذاتية
  MEDICAL_REPORT     // التقارير الطبية
  INSURANCE          // التأمين
  WORK_PERMIT        // تصريح العمل
  VISA               // تأشيرة
  DRIVING_LICENSE    // رخصة القيادة
  BANK_DETAILS       // البيانات البنكية
  TAX_DOCUMENTS      // الوثائق الضريبية
  POLICE_CLEARANCE   // شهادة حسن السيرة والسلوك
  REFERENCE_LETTER   // خطاب التوصية
  PERFORMANCE_REVIEW // تقييم الأداء
  WARNING_LETTER     // خطاب إنذار
  APPRECIATION       // خطاب شكر وتقدير
  OTHER              // أخرى
}
```

---

## 🚀 الميزات الرئيسية

### ✅ 1. رفع الوثائق

- رفع ملفات متعددة الأنواع (PDF, Images, Word, Excel)
- حد أقصى للملف: 10MB
- تخزين آمن على Cloudflare R2
- تنظيم تلقائي: `employees/{employeeId}/documents/{filename}`

### ✅ 2. إدارة الوثائق

- إضافة تواريخ الإصدار والانتهاء
- تصنيف حسب النوع
- إضافة ملاحظات ووصف لكل وثيقة
- تحديث معلومات الوثيقة بدون تغيير الملف

### ✅ 3. البحث والتصفية

- البحث بالعنوان أو الوصف
- التصفية حسب نوع الوثيقة
- التصفية حسب الموظف
- الترتيب حسب التاريخ أو الاسم

### ✅ 4. التنبيهات الذكية

- تنبيه للوثائق القريبة من الانتهاء
- عرض الوثائق المنتهية الصلاحية
- إمكانية تحديد عدد الأيام للتنبيه

### ✅ 5. الإحصائيات

- عدد الوثائق لكل موظف
- حجم الملفات الإجمالي
- توزيع الوثائق حسب النوع

---

## 📡 API Endpoints

### 1. رفع وثيقة جديدة

```http
POST /hr/employee-documents
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body (form-data):
  - file: File (required)
  - employeeId: string (required)
  - type: DocumentType (required)
  - title: string (required)
  - description: string (optional)
  - issueDate: string (optional, ISO date)
  - expiryDate: string (optional, ISO date)
```

**مثال (cURL):**

```bash
curl -X POST http://localhost:3000/hr/employee-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "employeeId=employee-uuid" \
  -F "type=CONTRACT" \
  -F "title=عقد العمل 2025" \
  -F "description=عقد عمل بدوام كامل" \
  -F "issueDate=2025-01-01" \
  -F "expiryDate=2026-01-01"
```

### 2. الحصول على جميع الوثائق (مع تصفية)

```http
GET /hr/employee-documents?employeeId={id}&type={type}&search={term}&page=1&limit=20
```

**Query Parameters:**

- `employeeId` (optional): معرف الموظف
- `type` (optional): نوع الوثيقة
- `search` (optional): البحث في العنوان/الوصف/اسم الملف
- `page` (optional, default: 1): رقم الصفحة
- `limit` (optional, default: 20): عدد النتائج
- `sortBy` (optional, default: createdAt): الترتيب حسب
- `sortOrder` (optional, default: desc): asc أو desc

### 3. الحصول على وثائق موظف معين

```http
GET /hr/employee-documents/employee/{employeeId}
```

### 4. الحصول على وثيقة واحدة

```http
GET /hr/employee-documents/{documentId}
```

### 5. تحديث معلومات الوثيقة

```http
PUT /hr/employee-documents/{documentId}
Content-Type: application/json

Body:
{
  "type": "CONTRACT",
  "title": "Updated Title",
  "description": "Updated description",
  "issueDate": "2025-01-01",
  "expiryDate": "2026-01-01"
}
```

### 6. حذف وثيقة

```http
DELETE /hr/employee-documents/{documentId}
```

### 7. الإحصائيات

```http
GET /hr/employee-documents/stats?employeeId={id}
```

**Response:**

```json
{
  "totalDocuments": 45,
  "totalSize": 15728640,
  "documentsByType": [
    { "type": "CONTRACT", "count": 12 },
    { "type": "CERTIFICATE", "count": 8 },
    { "type": "ID_COPY", "count": 25 }
  ]
}
```

### 8. الوثائق القريبة من الانتهاء

```http
GET /hr/employee-documents/expiring?daysBeforeExpiry=30
```

### 9. الوثائق المنتهية

```http
GET /hr/employee-documents/expired
```

---

## 💻 أمثلة الاستخدام

### مثال 1: رفع عقد عمل

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('employeeId', 'employee-uuid');
formData.append('type', 'CONTRACT');
formData.append('title', 'عقد العمل - أحمد محمد');
formData.append('description', 'عقد عمل بدوام كامل لمدة سنة');
formData.append('issueDate', '2025-01-01');
formData.append('expiryDate', '2026-01-01');

const response = await fetch('/hr/employee-documents', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const document = await response.json();
console.log('Document uploaded:', document);
```

### مثال 2: الحصول على وثائق موظف

```typescript
const employeeId = 'employee-uuid';
const response = await fetch(`/hr/employee-documents/employee/${employeeId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const documents = await response.json();
console.log('Employee documents:', documents);
```

### مثال 3: البحث عن الوثائق

```typescript
const params = new URLSearchParams({
  type: 'CERTIFICATE',
  search: 'شهادة',
  page: '1',
  limit: '10',
});

const response = await fetch(`/hr/employee-documents?${params}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { documents, pagination } = await response.json();
```

### مثال 4: فحص الوثائق المنتهية

```typescript
const response = await fetch('/hr/employee-documents/expired', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { documents, count } = await response.json();

if (count > 0) {
  console.warn(`تحذير: ${count} وثيقة منتهية الصلاحية`);
  documents.forEach((doc) => {
    console.log(`- ${doc.employee.firstName}: ${doc.title}`);
  });
}
```

---

## 🔒 الأمان والصلاحيات

### متطلبات الأمان:

1. جميع الـ endpoints محمية بـ `@Auth()` decorator
2. يجب تسجيل الدخول للوصول لأي endpoint
3. الملفات المرفوعة محدودة بـ:
   - الحجم: 10MB
   - الأنواع: PDF, Images, Word, Excel فقط

### أنواع الملفات المسموحة:

```typescript
const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
```

---

## 🗄️ قاعدة البيانات

### Schema:

```prisma
model EmployeeDocument {
  id           String       @id @default(uuid())
  employeeId   String
  employee     Employee     @relation("EmployeeDocuments", fields: [employeeId], references: [id], onDelete: Cascade)

  type         DocumentType
  title        String
  description  String?
  fileUrl      String
  fileKey      String
  fileName     String
  fileSize     Int?
  mimetype     String?

  issueDate    DateTime?
  expiryDate   DateTime?

  uploadedById String
  uploadedBy   User         @relation("UploadedEmployeeDocuments", fields: [uploadedById], references: [id])

  isDeleted    Boolean      @default(false)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([employeeId])
  @@index([type])
  @@index([expiryDate])
}
```

### Migration:

```bash
# إنشاء migration جديد
npx prisma migrate dev --name add_employee_documents

# تطبيق migrations
npx prisma migrate deploy

# تحديث Prisma Client
npx prisma generate
```

---

## 📊 Use Cases

### 1. نظام تنبيه للوثائق المنتهية

```typescript
// Cron Job - تشغيل يومي
@Cron('0 9 * * *') // كل يوم الساعة 9 صباحاً
async checkExpiringDocuments() {
  const { documents } = await this.documentsService.getExpiringDocuments({
    daysBeforeExpiry: 30
  });

  // إرسال إشعارات للموظفين والـ HR
  for (const doc of documents) {
    await this.notificationService.send({
      to: doc.employee.userId,
      title: 'تنبيه: وثيقة قاربت على الانتهاء',
      body: `وثيقة ${doc.title} ستنتهي في ${daysUntilExpiry} يوم`
    });
  }
}
```

### 2. لوحة تحكم الوثائق

```typescript
async getDocumentsDashboard() {
  const [stats, expiring, expired] = await Promise.all([
    this.documentsService.getDocumentStats(),
    this.documentsService.getExpiringDocuments({ daysBeforeExpiry: 30 }),
    this.documentsService.getExpiredDocuments(),
  ]);

  return {
    totalDocuments: stats.totalDocuments,
    totalSize: stats.totalSize,
    documentsByType: stats.documentsByType,
    expiringCount: expiring.count,
    expiredCount: expired.count,
    needsAttention: expired.documents.concat(expiring.documents)
  };
}
```

### 3. ملف شخصي للموظف مع الوثائق

```typescript
async getEmployeeProfile(employeeId: string) {
  const [employee, documents, stats] = await Promise.all([
    this.employeesService.findOne(employeeId),
    this.documentsService.findByEmployee(employeeId),
    this.documentsService.getDocumentStats(employeeId),
  ]);

  return {
    ...employee,
    documents: {
      list: documents,
      stats: stats,
      hasExpired: documents.some(d => d.expiryDate && d.expiryDate < new Date())
    }
  };
}
```

---

## 🎨 تحسينات مستقبلية مقترحة

1. **معاينة الملفات**: إضافة معاينة للـ PDF والصور
2. **إصدارات الوثائق**: حفظ نسخ متعددة من نفس الوثيقة
3. **التوقيعات الإلكترونية**: إضافة إمكانية التوقيع
4. **الأرشفة التلقائية**: أرشفة الوثائق القديمة
5. **OCR**: استخراج النصوص من الصور
6. **مشاركة محدودة**: مشاركة وثائق مع أطراف خارجية
7. **تشفير إضافي**: تشفير الملفات الحساسة

---

## 🐛 استكشاف الأخطاء

### خطأ: "File size exceeds 10MB limit"

**الحل:** قلل حجم الملف أو اضغطه قبل الرفع

### خطأ: "File type not allowed"

**الحل:** تأكد أن الملف من الأنواع المسموحة (PDF, Images, Word, Excel)

### خطأ: "Employee not found"

**الحل:** تأكد من صحة `employeeId` وأن الموظف غير محذوف

### خطأ: "Failed to upload document"

**الحل:** تأكد من إعدادات Cloudflare R2 في `.env`:

```env
CLOUDFLARE_R2_ENDPOINT=https://...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_PUBLIC_URL=https://...
```

---

## 📞 الدعم

للمساعدة أو الاستفسارات، يرجى التواصل مع فريق التطوير.

---

**تم التطوير بـ ❤️ لنظام iZeus ERP**
