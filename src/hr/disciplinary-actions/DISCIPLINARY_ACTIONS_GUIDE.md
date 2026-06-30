# ⚠️ دليل نظام الإنذارات والجزاءات - Disciplinary Actions System

## 🎯 نظرة عامة

نظام متكامل لإدارة الإنذارات والجزاءات للموظفين مع تتبع شامل وتقارير تفصيلية.

---

## 📋 أنواع الإجراءات

### ActionType - نوع الإجراء

```typescript
enum ActionType {
  VERBAL_WARNING      // إنذار شفهي
  WRITTEN_WARNING     // إنذار كتابي
  FINAL_WARNING       // إنذار نهائي
  SALARY_DEDUCTION    // خصم من الراتب
  SUSPENSION          // إيقاف عن العمل
  DEMOTION            // تخفيض الدرجة
  TERMINATION         // فصل من العمل
  NOTE                // ملاحظة (للتوثيق)
}
```

### Severity - مستوى الخطورة

```typescript
enum Severity {
  LOW         // بسيط
  MEDIUM      // متوسط
  HIGH        // عالي
  CRITICAL    // حرج جداً
}
```

### ActionCategory - فئة الإجراء

```typescript
enum ActionCategory {
  BEHAVIORAL      // سلوكي (سوء السلوك، عدم الاحترام)
  ATTENDANCE      // الحضور (تأخير، غياب)
  PERFORMANCE     // الأداء (ضعف الأداء، عدم إنجاز المهام)
  POLICY_VIOLATION // انتهاك السياسات
  SAFETY          // السلامة والأمان
  FINANCIAL       // مالي (سرقة، احتيال)
  MISCONDUCT      // سوء السلوك المهني
  OTHER           // أخرى
}
```

### ActionStatus - حالة الإجراء

```typescript
enum ActionStatus {
  ACTIVE      // نشط
  RESOLVED    // تم حله
  APPEALED    // تم الاستئناف
  CANCELLED   // ملغي
}
```

---

## 🚀 الميزات الرئيسية

### ✅ 1. إدارة الإنذارات

- إنذارات شفهية وكتابية ونهائية
- تسجيل تاريخ ووقت الإجراء
- إضافة أدلة (روابط للملفات)
- أسماء الشهود

### ✅ 2. الجزاءات المالية

- خصم من الراتب (المبلغ وعدد الأيام)
- تتبع إجمالي الخصومات
- ربط تلقائي بنظام الرواتب

### ✅ 3. الإيقاف عن العمل

- تحديد عدد أيام الإيقاف
- تتبع مدة الإيقاف
- تأثير على الحضور

### ✅ 4. التصنيف والتتبع

- 8 فئات مختلفة
- 4 مستويات خطورة
- 4 حالات للإجراء

### ✅ 5. التقارير والإحصائيات

- إحصائيات شاملة
- سجل كامل للموظف
- الموظفون بإنذارات متعددة
- الإجراءات الحرجة

---

## 📡 API Endpoints

### 1. إنشاء إجراء تأديبي

```http
POST /hr/disciplinary-actions
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "employeeId": "emp-uuid",
  "type": "WRITTEN_WARNING",
  "severity": "MEDIUM",
  "category": "ATTENDANCE",
  "title": "تأخير متكرر",
  "reason": "تأخر عن العمل 5 مرات هذا الشهر",
  "description": "تفاصيل إضافية...",
  "actionDate": "2025-10-07",
  "penalty": "إنذار كتابي مع التنبيه",
  "evidenceUrl": "https://...",
  "witnessNames": "أحمد، سارة"
}
```

### 2. الحصول على جميع الإجراءات (مع تصفية)

```http
GET /hr/disciplinary-actions?employeeId={id}&type={type}&severity={severity}&status={status}&page=1&limit=20
```

**Query Parameters:**

- `employeeId` (optional): معرف الموظف
- `type` (optional): نوع الإجراء
- `severity` (optional): مستوى الخطورة
- `category` (optional): الفئة
- `status` (optional): الحالة
- `search` (optional): البحث في العنوان/السبب/الوصف
- `startDate` (optional): تاريخ البداية
- `endDate` (optional): تاريخ النهاية
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `sortBy` (optional): actionDate | createdAt | severity
- `sortOrder` (optional): asc | desc

### 3. الحصول على إجراءات موظف محدد

```http
GET /hr/disciplinary-actions/employee/{employeeId}
```

### 4. سجل الموظف الكامل (مع إحصائيات)

```http
GET /hr/disciplinary-actions/employee/{employeeId}/history
```

**Response:**

```json
{
  "employee": {
    "id": "emp-uuid",
    "firstName": "أحمد",
    "lastName": "محمد"
  },
  "actions": [...],
  "stats": {
    "total": 5,
    "active": 2,
    "resolved": 3,
    "byType": [
      { "type": "WRITTEN_WARNING", "count": 3 },
      { "type": "VERBAL_WARNING", "count": 2 }
    ],
    "bySeverity": [
      { "severity": "MEDIUM", "count": 3 },
      { "severity": "LOW", "count": 2 }
    ],
    "totalDeductions": 150000,
    "totalSuspensionDays": 5
  }
}
```

### 5. الحصول على إجراء واحد

```http
GET /hr/disciplinary-actions/{id}
```

### 6. تحديث إجراء

```http
PUT /hr/disciplinary-actions/{id}
Content-Type: application/json

Body:
{
  "type": "FINAL_WARNING",
  "severity": "HIGH",
  "title": "Updated title",
  "description": "Updated description"
}
```

### 7. حل/إغلاق إجراء

```http
PUT /hr/disciplinary-actions/{id}/resolve
Content-Type: application/json

Body:
{
  "status": "RESOLVED",
  "resolvedDate": "2025-10-15",
  "resolvedNotes": "تم حل المشكلة والالتزام بالتعليمات"
}
```

### 8. حذف إجراء

```http
DELETE /hr/disciplinary-actions/{id}
```

### 9. الإحصائيات الشاملة

```http
GET /hr/disciplinary-actions/stats
```

**Response:**

```json
{
  "totalActions": 45,
  "activeActions": 12,
  "resolvedActions": 30,
  "byType": [...],
  "bySeverity": [...],
  "byCategory": [...],
  "recentActions": [...]
}
```

### 10. الإجراءات الحرجة

```http
GET /hr/disciplinary-actions/critical
```

### 11. الموظفون بإنذارات متعددة

```http
GET /hr/disciplinary-actions/multiple-warnings?minWarnings=3
```

**Response:**

```json
[
  {
    "id": "emp-uuid",
    "firstName": "أحمد",
    "lastName": "محمد",
    "job": {...},
    "warningCount": 5,
    "actions": [...]
  }
]
```

---

## 💻 أمثلة الاستخدام

### مثال 1: إنذار شفهي للتأخير

```typescript
const action = await createDisciplinaryAction({
  employeeId: 'emp-uuid',
  type: 'VERBAL_WARNING',
  severity: 'LOW',
  category: 'ATTENDANCE',
  title: 'تأخير عن العمل',
  reason: 'وصول متأخر بـ 30 دقيقة',
  actionDate: '2025-10-07',
  penalty: 'تحذير شفهي مع التنبيه',
});
```

### مثال 2: خصم من الراتب

```typescript
const action = await createDisciplinaryAction({
  employeeId: 'emp-uuid',
  type: 'SALARY_DEDUCTION',
  severity: 'MEDIUM',
  category: 'ATTENDANCE',
  title: 'غياب بدون عذر',
  reason: 'غياب 3 أيام بدون إذن',
  actionDate: '2025-10-07',
  deductionAmount: 150000, // 150,000 IQD
  deductionDays: 3, // 3 أيام
  penalty: 'خصم 3 أيام من الراتب',
});
```

### مثال 3: إيقاف عن العمل

```typescript
const action = await createDisciplinaryAction({
  employeeId: 'emp-uuid',
  type: 'SUSPENSION',
  severity: 'HIGH',
  category: 'MISCONDUCT',
  title: 'سوء سلوك مع العملاء',
  reason: 'تعامل غير لائق مع عميل',
  actionDate: '2025-10-07',
  suspensionDays: 5,
  penalty: 'إيقاف عن العمل لمدة 5 أيام بدون راتب',
  witnessNames: 'سارة علي، محمود حسن',
});
```

### مثال 4: إنذار نهائي

```typescript
const action = await createDisciplinaryAction({
  employeeId: 'emp-uuid',
  type: 'FINAL_WARNING',
  severity: 'CRITICAL',
  category: 'PERFORMANCE',
  title: 'ضعف الأداء المستمر',
  reason: 'عدم تحقيق الأهداف لمدة 6 أشهر',
  description: 'على الرغم من التدريب والإنذارات السابقة...',
  actionDate: '2025-10-07',
  penalty: 'إنذار نهائي - التحسين خلال شهر أو الفصل',
});
```

### مثال 5: حل إجراء

```typescript
const resolved = await resolveAction(actionId, {
  status: 'RESOLVED',
  resolvedDate: '2025-10-15',
  resolvedNotes: 'تحسن الأداء بشكل ملحوظ، تم إغلاق الإجراء',
});
```

---

## 📊 Use Cases

### 1. نظام التصعيد التدريجي

```typescript
// المرحلة 1: إنذار شفهي
if (lateCount === 1) {
  createAction({ type: 'VERBAL_WARNING', severity: 'LOW' });
}

// المرحلة 2: إنذار كتابي
else if (lateCount === 3) {
  createAction({ type: 'WRITTEN_WARNING', severity: 'MEDIUM' });
}

// المرحلة 3: خصم من الراتب
else if (lateCount === 5) {
  createAction({
    type: 'SALARY_DEDUCTION',
    severity: 'HIGH',
    deductionDays: 1,
  });
}

// المرحلة 4: إنذار نهائي
else if (lateCount === 7) {
  createAction({ type: 'FINAL_WARNING', severity: 'CRITICAL' });
}
```

### 2. تقرير شهري بالإنذارات

```typescript
const thisMonth = {
  startDate: '2025-10-01',
  endDate: '2025-10-31',
};

const monthlyActions = await findAll({
  startDate: thisMonth.startDate,
  endDate: thisMonth.endDate,
});

// تحليل البيانات
const summary = {
  total: monthlyActions.total,
  byCategory: groupBy(monthlyActions.actions, 'category'),
  bySeverity: groupBy(monthlyActions.actions, 'severity'),
  mostViolated: findMostCommonReason(monthlyActions.actions),
};
```

### 3. تنبيه للموظفين المشكلين

```typescript
// الموظفون بـ 3 إنذارات أو أكثر
const problematicEmployees = await getEmployeesWithMultipleWarnings(3);

// إرسال تنبيه للـ HR
for (const emp of problematicEmployees) {
  await sendNotification({
    to: 'hr@company.com',
    subject: `تنبيه: موظف بـ ${emp.warningCount} إنذارات`,
    body: `الموظف ${emp.firstName} لديه ${emp.warningCount} إنذار نشط`,
  });
}
```

### 4. مراجعة الإجراءات الحرجة

```typescript
// الحصول على جميع الإجراءات الحرجة
const criticalActions = await getCriticalActions();

// مراجعة ومتابعة
for (const action of criticalActions) {
  console.log(`⚠️ ${action.employee.firstName}: ${action.title}`);
  console.log(`   Type: ${action.type}`);
  console.log(`   Date: ${action.actionDate}`);
}
```

---

## 🔒 الأمان والصلاحيات

### متطلبات الأمان:

1. ✅ جميع الـ endpoints محمية بـ `@Auth()` decorator
2. ✅ يجب تسجيل الدخول للوصول
3. ✅ تتبع من أصدر الإجراء (`issuedById`)

### الصلاحيات المقترحة (للتطبيق المستقبلي):

```typescript
- hr:disciplinary-actions:read    // قراءة الإجراءات
- hr:disciplinary-actions:create  // إنشاء إجراءات
- hr:disciplinary-actions:update  // تعديل إجراءات
- hr:disciplinary-actions:delete  // حذف إجراءات
- hr:disciplinary-actions:resolve // حل/إغلاق إجراءات
```

---

## 🗄️ قاعدة البيانات

### Schema:

```prisma
model DisciplinaryAction {
  id          String     @id @default(uuid())
  employeeId  String
  employee    Employee   @relation(fields: [employeeId], references: [id])

  type        ActionType
  severity    Severity
  category    ActionCategory @default(BEHAVIORAL)

  title       String
  reason      String
  description String?
  actionDate  DateTime

  // الجزاءات
  penalty         String?
  deductionAmount Decimal?
  deductionDays   Int?
  suspensionDays  Int?

  // معلومات إضافية
  evidenceUrl     String?
  witnessNames    String?

  // الحالة
  status          ActionStatus @default(ACTIVE)
  resolvedDate    DateTime?
  resolvedNotes   String?

  issuedById  String
  issuedBy    User

  isDeleted   Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([employeeId])
  @@index([type])
  @@index([severity])
  @@index([status])
}
```

### Indexes للأداء:

```prisma
@@index([employeeId])    // البحث بالموظف
@@index([type])          // البحث بالنوع
@@index([severity])      // البحث بالخطورة
@@index([status])        // البحث بالحالة
@@index([actionDate])    // الترتيب بالتاريخ
```

---

## 📊 التقارير المتاحة

### 1. إحصائيات عامة

```typescript
GET /hr/disciplinary-actions/stats

Response:
{
  totalActions: 120,
  activeActions: 25,
  resolvedActions: 90,
  byType: [
    { type: 'WRITTEN_WARNING', count: 45 },
    { type: 'VERBAL_WARNING', count: 30 },
    { type: 'SALARY_DEDUCTION', count: 20 },
    // ...
  ],
  bySeverity: [
    { severity: 'MEDIUM', count: 50 },
    { severity: 'LOW', count: 40 },
    // ...
  ],
  byCategory: [
    { category: 'ATTENDANCE', count: 60 },
    { category: 'PERFORMANCE', count: 30 },
    // ...
  ],
  recentActions: [...]
}
```

### 2. سجل موظف محدد

```typescript
GET /hr/disciplinary-actions/employee/{employeeId}/history

Response:
{
  employee: { id, firstName, lastName },
  actions: [...],
  stats: {
    total: 5,
    active: 2,
    resolved: 3,
    byType: [...],
    bySeverity: [...],
    totalDeductions: 150000,
    totalSuspensionDays: 5
  }
}
```

### 3. الموظفون المشكلين

```typescript
GET /hr/disciplinary-actions/multiple-warnings?minWarnings=3

Response:
[
  {
    id: "emp-uuid",
    firstName: "أحمد",
    lastName: "محمد",
    job: { name: "مطور" },
    warningCount: 5,
    actions: [...]
  }
]
```

### 4. الإجراءات الحرجة

```typescript
GET /hr/disciplinary-actions/critical

Response:
[
  {
    id: "action-uuid",
    type: "FINAL_WARNING",
    severity: "CRITICAL",
    employee: {...},
    // ...
  }
]
```

---

## 🎯 سيناريوهات الاستخدام

### السيناريو 1: موظف متأخر بشكل متكرر

**الخطوات:**

1. **الأسبوع 1**: إنذار شفهي (VERBAL_WARNING)
2. **الأسبوع 2**: لا يزال يتأخر → إنذار كتابي (WRITTEN_WARNING)
3. **الأسبوع 3**: لا يزال يتأخر → خصم من الراتب (SALARY_DEDUCTION)
4. **الأسبوع 4**: لا يزال يتأخر → إنذار نهائي (FINAL_WARNING)
5. **بعد ذلك**: إذا لم يتحسن → فصل (TERMINATION)

### السيناريو 2: ضعف الأداء

**الخطوات:**

1. **الشهر 1**: ملاحظة توثيقية (NOTE) - تسجيل ضعف الأداء
2. **الشهر 2**: إنذار كتابي (WRITTEN_WARNING) مع خطة تحسين
3. **الشهر 3**:
   - إذا تحسن → حل الإجراء (RESOLVED)
   - إذا لم يتحسن → إنذار نهائي (FINAL_WARNING)
4. **الشهر 4**:
   - إذا تحسن → حل الإجراء (RESOLVED)
   - إذا لم يتحسن → فصل (TERMINATION)

### السيناريو 3: حادث سلامة خطير

**الخطوة المباشرة:**

```typescript
createAction({
  type: 'SUSPENSION',
  severity: 'CRITICAL',
  category: 'SAFETY',
  title: 'انتهاك قواعد السلامة',
  reason: 'عدم ارتداء معدات السلامة رغم التحذيرات',
  suspensionDays: 7,
  penalty: 'إيقاف 7 أيام بدون راتب',
});
```

---

## 🎨 تكامل مع الأنظمة الأخرى

### 1. ربط مع نظام الرواتب

```typescript
// عند حساب الراتب، خصم الأيام المعاقب عليها
const deductionActions = await findAll({
  employeeId,
  type: 'SALARY_DEDUCTION',
  status: 'ACTIVE',
  startDate: monthStart,
  endDate: monthEnd,
});

let totalDeduction = 0;
for (const action of deductionActions.actions) {
  if (action.deductionAmount) {
    totalDeduction += Number(action.deductionAmount);
  }
  if (action.deductionDays) {
    totalDeduction += dailySalary * action.deductionDays;
  }
}

finalSalary -= totalDeduction;
```

### 2. ربط مع نظام الحضور

```typescript
// عند الإيقاف، تسجيل غياب تلقائي
if (action.type === 'SUSPENSION' && action.suspensionDays) {
  for (let i = 0; i < action.suspensionDays; i++) {
    await createAttendance({
      employeeId: action.employeeId,
      date: addDays(action.actionDate, i),
      status: 'ABSENT',
      notes: `إيقاف - إجراء تأديبي #${action.id}`,
    });
  }
}
```

### 3. ربط مع نظام الإشعارات

```typescript
// إرسال إشعار عند إنشاء إجراء
await notificationService.send({
  to: action.employee.userId,
  title: 'إجراء تأديبي جديد',
  body: `تم إصدار ${getActionTypeLabel(action.type)} بتاريخ ${action.actionDate}`,
  link: `/hr/employees/view/${action.employeeId}/disciplinary`,
});

// إشعار للمدير
await notificationService.send({
  to: action.employee.managerId,
  title: 'تنبيه: إجراء تأديبي',
  body: `تم إصدار إجراء تأديبي للموظف ${action.employee.firstName}`,
  link: `/hr/disciplinary-actions/${action.id}`,
});
```

---

## 🐛 استكشاف الأخطاء

### خطأ: "Employee not found"

**الحل:** تأكد من صحة `employeeId` وأن الموظف غير محذوف

### خطأ: "Action is already resolved or cancelled"

**الحل:** لا يمكن حل إجراء محلول أو ملغي مسبقاً

### خطأ: "Failed to create disciplinary action"

**الحل:** تحقق من:

1. جميع الحقول المطلوبة موجودة
2. التواريخ بصيغة صحيحة (ISO 8601)
3. الـ enums صحيحة

---

## 📈 أفضل الممارسات

### 1. التوثيق الدقيق

```typescript
✅ سجل كل التفاصيل في الوصف
✅ أضف أسماء الشهود
✅ ارفع أدلة (evidenceUrl)
✅ حدد التاريخ بدقة
```

### 2. التصعيد التدريجي

```typescript
✅ ابدأ بإنذار شفهي
✅ ثم كتابي
✅ ثم نهائي
✅ الفصل آخر الحلول
```

### 3. الموضوعية

```typescript
✅ استخدم لغة مهنية
✅ سجل الحقائق فقط
✅ وثّق الأدلة
✅ كن عادلاً
```

### 4. المتابعة

```typescript
✅ راجع الإجراءات بشكل دوري
✅ حل الإجراءات عند التحسن
✅ تتبع الموظفين بإنذارات متعددة
✅ راقب الاتجاهات
```

---

## 📞 الدعم

للمساعدة أو الاستفسارات، يرجى مراجعة:

- التوثيق الكامل في هذا الملف
- الكود المصدري
- فريق التطوير

---

**تم التطوير بـ ❤️ لنظام iZeus ERP**
