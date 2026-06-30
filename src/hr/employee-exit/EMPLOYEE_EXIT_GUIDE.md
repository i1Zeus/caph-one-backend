# 👋 دليل نظام إنهاء خدمة الموظف - Employee Exit Management

## 🎯 نظرة عامة

نظام متكامل لإدارة إنهاء خدمة الموظفين بطريقة احترافية ومنظمة.

---

## 📋 أنواع الإنهاء (7 أنواع)

```typescript
enum ExitType {
  RESIGNATION      // استقالة - الموظف يترك بإرادته
  TERMINATION      // فصل - إنهاء من الشركة
  RETIREMENT       // تقاعد - بلوغ سن التقاعد
  CONTRACT_END     // انتهاء العقد - انتهاء عقد محدد المدة
  MUTUAL_AGREEMENT // اتفاق متبادل - اتفاق بين الطرفين
  DEATH            // وفاة - رحمه الله
  OTHER            // أخرى
}
```

---

## 🚀 الميزات الرئيسية

### ✅ 1. إدارة الإنهاء
- تسجيل نوع وتاريخ الإنهاء
- تحديد آخر يوم عمل
- توثيق الأسباب (مختصر + تفصيلي)
- تحديد إمكانية إعادة التوظيف

### ✅ 2. Exit Interview - مقابلة الخروج
- تسجيل إجراء المقابلة
- تاريخ المقابلة
- ملاحظات وتغذية راجعة من الموظف
- تقييم إمكانية إعادة التوظيف

### ✅ 3. Clearance Checklist - قائمة التسليم
```typescript
✅ assetReturned         - تسليم الأصول (لابتوب، مفاتيح، إلخ)
✅ documentsSigned       - توقيع المستندات
✅ accessRevoked         - إلغاء الصلاحيات (بريد، أنظمة)
✅ exitInterviewCompleted - إتمام مقابلة الخروج
✅ handoverCompleted     - تسليم المهام للبديل
```

### ✅ 4. Financial Settlement - التسوية المالية
- حساب المبلغ النهائي (مستحقات/خصومات)
- تتبع الدفع
- تاريخ التسوية
- ملاحظات التسوية

### ✅ 5. التقارير والإحصائيات
- إحصائيات شاملة
- معدل دوران الموظفين (Turnover)
- متوسط سنوات الخدمة
- توزيع حسب نوع الإنهاء
- الإجراءات المعلقة

---

## 📡 API Endpoints (13 endpoint)

```
POST   /hr/employee-exit                        إنشاء سجل إنهاء
GET    /hr/employee-exit                        قائمة جميع الإنهاءات
GET    /hr/employee-exit/stats                  الإحصائيات
GET    /hr/employee-exit/clearance-pending      الإجراءات المعلقة
GET    /hr/employee-exit/settlement-pending     التسويات المعلقة
GET    /hr/employee-exit/employee/:id           سجل إنهاء موظف محدد
GET    /hr/employee-exit/:id                    سجل واحد
PUT    /hr/employee-exit/:id                    تحديث سجل
PUT    /hr/employee-exit/:id/clearance          تحديث قائمة التسليم
PUT    /hr/employee-exit/:id/settlement         تحديث التسوية المالية
PUT    /hr/employee-exit/:id/interview          تسجيل مقابلة الخروج
DELETE /hr/employee-exit/:id                    حذف سجل (استرجاع الموظف)
```

---

## 💻 أمثلة الاستخدام

### مثال 1: تسجيل استقالة موظف

```typescript
POST /hr/employee-exit
{
  "employeeId": "emp-001",
  "exitType": "RESIGNATION",
  "exitDate": "2025-11-30",
  "lastWorkingDay": "2025-11-30",
  "reason": "فرصة عمل أفضل",
  "detailedReason": "انتقل إلى شركة أخرى براتب أعلى",
  "rehireEligible": true
}
```

**النتيجة:**
- ✅ يتم إنشاء سجل Exit
- ✅ تحديث حالة الموظف إلى TERMINATED تلقائياً
- ✅ تحديث terminationDate

### مثال 2: فصل موظف

```typescript
POST /hr/employee-exit
{
  "employeeId": "emp-002",
  "exitType": "TERMINATION",
  "exitDate": "2025-10-31",
  "lastWorkingDay": "2025-10-31",
  "reason": "انتهاكات متكررة",
  "detailedReason": "تأخير مستمر وضعف أداء",
  "rehireEligible": false
}
```

### مثال 3: تحديث قائمة التسليم

```typescript
PUT /hr/employee-exit/{id}/clearance
{
  "assetReturned": true,
  "documentsSigned": true,
  "accessRevoked": true,
  "handoverCompleted": true,
  "exitInterviewCompleted": true
}
```

### مثال 4: مقابلة الخروج

```typescript
PUT /hr/employee-exit/{id}/interview
{
  "exitInterviewDone": true,
  "exitInterviewDate": "2025-11-25",
  "feedback": "بيئة عمل جيدة لكن الراتب منخفض",
  "rehireEligible": true
}
```

### مثال 5: التسوية المالية

```typescript
PUT /hr/employee-exit/{id}/settlement
{
  "finalSettlement": 2500000,  // 2,500,000 IQD (مستحقات)
  "settlementPaid": true,
  "settlementDate": "2025-12-05",
  "settlementNotes": "راتب نوفمبر + بدل نهاية الخدمة"
}
```

---

## 🔄 سير العمل الموصى به

### خطوات إنهاء الخدمة الاحترافية

```
1. تسجيل الإنهاء
   ↓
2. Exit Interview (مقابلة الخروج)
   - جمع ملاحظات الموظف
   - تقييم إمكانية إعادة التوظيف
   ↓
3. Clearance Checklist
   - تسليم الأصول ✅
   - توقيع المستندات ✅
   - إلغاء الصلاحيات ✅
   - تسليم المهام ✅
   ↓
4. Financial Settlement
   - حساب المستحقات/الخصومات
   - الدفع
   - إغلاق الملف
   ↓
5. ✅ Exit Complete
```

---

## 📊 التقارير والإحصائيات

### 1. إحصائيات عامة
```typescript
GET /hr/employee-exit/stats

Response:
{
  total: 45,
  thisMonth: 3,
  thisYear: 18,
  byExitType: [
    { exitType: 'RESIGNATION', count: 25 },
    { exitType: 'CONTRACT_END', count: 12 },
    { exitType: 'TERMINATION', count: 5 },
    // ...
  ],
  pendingClearance: 5,
  pendingSettlement: 3,
  averageServiceYears: 3.2
}
```

### 2. الإجراءات المعلقة
```typescript
GET /hr/employee-exit/clearance-pending

// موظفون لم يكملوا قائمة التسليم
```

### 3. التسويات المعلقة
```typescript
GET /hr/employee-exit/settlement-pending

// موظفون لم يستلموا مستحقاتهم
```

---

## 🎯 Use Cases

### Use Case 1: موظف يستقيل

**الخطوات:**
1. الموظف يقدم استقالة (يمكن عبر نظام الطلبات)
2. HR يسجل الإنهاء:
   ```typescript
   createExit({
     exitType: 'RESIGNATION',
     exitDate: '2025-12-31',
     lastWorkingDay: '2025-12-31'
   });
   ```
3. إجراء Exit Interview
4. Clearance Checklist
5. حساب التسوية النهائية
6. الدفع
7. ✅ إغلاق الملف

### Use Case 2: انتهاء عقد محدد المدة

**الخطوات:**
1. قبل 30 يوم من انتهاء العقد: تنبيه HR
2. تقرير ما إذا كان سيتم التجديد أم لا
3. إذا لن يُجدد:
   ```typescript
   createExit({
     exitType: 'CONTRACT_END',
     exitDate: contractEndDate,
     lastWorkingDay: contractEndDate
   });
   ```
4. إكمال الإجراءات

### Use Case 3: التقاعد

```typescript
createExit({
  exitType: 'RETIREMENT',
  exitDate: retirementDate,
  lastWorkingDay: retirementDate,
  reason: 'بلوغ سن التقاعد',
  finalSettlement: calculateRetirementBenefits()
});
```

---

## 💰 حساب التسوية النهائية

### المستحقات (موجب +)
```
+ راتب الشهر الحالي (نسبة الأيام)
+ بدل نهاية الخدمة (حسب سنوات الخدمة)
+ رصيد الإجازات غير المستخدم
+ مكافآت مستحقة
```

### الخصومات (سالب -)
```
- سلف لم تُسدد
- خصومات معلقة
- تأمينات
- أخرى
```

### الصيغة
```typescript
finalSettlement = 
  (currentMonthSalary * workedDaysRatio) +
  endOfServiceBenefit +
  unusedVacationPay +
  bonuses -
  loans -
  deductions;
```

---

## 🔗 التكامل مع الأنظمة الأخرى

### 1. مع نظام الموظفين
```typescript
// تحديث تلقائي لحالة الموظف
employee.employmentStatus = 'TERMINATED';
employee.terminationDate = exit.exitDate;
```

### 2. مع نظام الرواتب
```typescript
// حساب راتب الشهر الحالي نسبياً
const workedDays = calculateWorkedDays(monthStart, lastWorkingDay);
const finalSalary = (monthlySalary / totalDaysInMonth) * workedDays;
```

### 3. مع نظام الإجازات
```typescript
// حساب رصيد الإجازات غير المستخدم
const unusedVacationDays = employee.leavesAllowed - usedVacationDays;
const vacationPay = (dailySalary * unusedVacationDays);
```

### 4. مع نظام الصلاحيات
```typescript
// إلغاء تلقائي للصلاحيات
if (exit.accessRevoked) {
  await revokeAllAccess(employee.userId);
  await disableUserAccount(employee.userId);
}
```

---

## 📊 Clearance Checklist

### القائمة الكاملة
```
☐ تسليم الأصول (assetReturned)
  - لابتوب
  - هاتف الشركة
  - مفاتيح المكتب
  - بطاقة الدخول
  - أي معدات أخرى

☐ توقيع المستندات (documentsSigned)
  - إقرار التسليم
  - سرية المعلومات
  - عدم المنافسة (إن وجد)

☐ إلغاء الصلاحيات (accessRevoked)
  - البريد الإلكتروني
  - الأنظمة الداخلية
  - VPN
  - حسابات التطبيقات

☐ مقابلة الخروج (exitInterviewCompleted)
  - جمع الملاحظات
  - تقييم التجربة
  - اقتراحات للتحسين

☐ تسليم المهام (handoverCompleted)
  - نقل المهام للبديل
  - توثيق العمليات
  - تسليم الملفات
```

---

## 🎨 مثال تطبيقي كامل

### السيناريو: موظف يستقيل

```typescript
// 1. الموظف يقدم استقالة
const resignation = await createRequest({
  type: 'RESIGNATION',
  title: 'طلب استقالة',
  description: 'أرغب في الاستقالة لظروف شخصية'
});

// 2. الإدارة توافق
await reviewRequest(resignation.id, { status: 'APPROVED' });

// 3. HR يسجل الإنهاء
const exit = await createExit({
  employeeId: employee.id,
  exitType: 'RESIGNATION',
  exitDate: '2025-12-31',
  lastWorkingDay: '2025-12-31',
  reason: 'ظروف شخصية'
});

// 4. Exit Interview
await recordInterview(exit.id, {
  exitInterviewDone: true,
  exitInterviewDate: '2025-12-28',
  feedback: 'تجربة عمل رائعة، لكن أحتاج التفرغ للعائلة',
  rehireEligible: true
});

// 5. Clearance Checklist
await updateClearance(exit.id, {
  assetReturned: true,
  documentsSigned: true,
  accessRevoked: true,
  handoverCompleted: true,
  exitInterviewCompleted: true
});

// 6. Financial Settlement
const settlement = calculateSettlement(employee);
await updateSettlement(exit.id, {
  finalSettlement: settlement.amount,
  settlementPaid: true,
  settlementDate: '2026-01-05',
  settlementNotes: 'راتب ديسمبر + بدل نهاية الخدمة'
});

// 7. ✅ Exit Complete!
```

---

## 📈 Turnover Analysis - تحليل دوران الموظفين

### معدل دوران الموظفين
```typescript
const turnoverRate = (exitsThisYear / averageEmployees) * 100;

// مثال:
// 18 موظف غادر / 50 موظف متوسط = 36% معدل دوران
```

### أسباب المغادرة الشائعة
```typescript
const exitReasons = stats.byExitType;

// تحليل:
// - RESIGNATION: 60% (أكثر الأسباب)
// - CONTRACT_END: 25%
// - TERMINATION: 10%
// - RETIREMENT: 5%
```

---

## 🔍 Endpoints التفصيلية

### 1. إنشاء Exit Record
```http
POST /hr/employee-exit
Authorization: Bearer {token}

Body:
{
  "employeeId": "emp-uuid",
  "exitType": "RESIGNATION",
  "exitDate": "2025-12-31",
  "lastWorkingDay": "2025-12-31",
  "reason": "ظروف شخصية",
  "rehireEligible": true,
  "finalSettlement": 2500000
}
```

### 2. تحديث Clearance Checklist
```http
PUT /hr/employee-exit/{id}/clearance

Body:
{
  "assetReturned": true,
  "documentsSigned": true,
  "accessRevoked": true,
  "exitInterviewCompleted": true,
  "handoverCompleted": true
}
```

### 3. تسجيل Exit Interview
```http
PUT /hr/employee-exit/{id}/interview

Body:
{
  "exitInterviewDone": true,
  "exitInterviewDate": "2025-12-28",
  "feedback": "تجربة إيجابية بشكل عام",
  "rehireEligible": true
}
```

### 4. التسوية المالية
```http
PUT /hr/employee-exit/{id}/settlement

Body:
{
  "finalSettlement": 2500000,
  "settlementPaid": true,
  "settlementDate": "2026-01-05",
  "settlementNotes": "راتب ديسمبر الكامل + بدل نهاية الخدمة (3 سنوات)"
}
```

---

## 🔒 الأمان

### الصلاحيات المقترحة
```typescript
hr:exit:create   // إنشاء سجل إنهاء
hr:exit:read     // قراءة سجلات الإنهاء
hr:exit:update   // تحديث سجل
hr:exit:delete   // حذف سجل (استرجاع موظف)
```

### ملاحظات أمنية
- ✅ تتبع من أجرى عملية الإنهاء
- ✅ Soft delete - يمكن الاسترجاع
- ✅ Audit trail كامل

---

## 🎓 أفضل الممارسات

### 1. التخطيط المسبق
```
✅ إشعار مسبق (30 يوم للاستقالة)
✅ تحديد البديل
✅ تخطيط تسليم المهام
```

### 2. التوثيق الدقيق
```
✅ توثيق الأسباب
✅ حفظ المراسلات
✅ تسجيل Exit Interview
✅ صور للتسليمات
```

### 3. الاحترافية
```
✅ معاملة محترمة
✅ شكر على الخدمة
✅ توصية (إن استحق)
✅ بقاء العلاقة الطيبة
```

### 4. المتابعة
```
✅ متابعة التسليم
✅ التأكد من إتمام الإجراءات
✅ الدفع في الموعد
✅ تحليل أسباب المغادرة
```

---

## 🐛 استكشاف الأخطاء

### خطأ: "Employee already has an exit record"
**الحل:** موظف واحد يمكنه فقط سجل إنهاء واحد

### خطأ: "Employee not found"
**الحل:** تأكد من employeeId صحيح

---

**تم التطوير بـ ❤️ لـ DevHouse ERP System**

