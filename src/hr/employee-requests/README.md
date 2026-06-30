# 📝 نظام طلبات الموظفين - Employee Requests System

## 🎯 نظرة عامة

نظام متكامل لإدارة طلبات الموظفين مع دعم 11 نوع مختلف من الطلبات وموافقات متعددة المستويات.

---

## 📋 أنواع الطلبات (11 نوع)

| النوع               | الوصف                    | مثال                   |
| ------------------- | ------------------------ | ---------------------- |
| `SALARY_ADVANCE`    | سلفة على الراتب          | طلب سلفة 500,000 IQD   |
| `CERTIFICATE`       | شهادة عمل                | شهادة راتب، شهادة خبرة |
| `VACATION_BALANCE`  | استعلام عن رصيد الإجازات | كم باقي من إجازاتي؟    |
| `SHIFT_CHANGE`      | تغيير الوردية            | من نهاري إلى ليلي      |
| `OVERTIME_APPROVAL` | موافقة على عمل إضافي     | العمل يوم الجمعة       |
| `EXPENSE_CLAIM`     | مطالبة بمصاريف           | مصاريف سفر، تدريب      |
| `TRANSFER_REQUEST`  | طلب نقل                  | نقل لفرع آخر/قسم آخر   |
| `RESIGNATION`       | استقالة                  | استقالة من العمل       |
| `COMPLAINT`         | شكوى                     | شكوى ضد موظف/إدارة     |
| `SUGGESTION`        | اقتراح                   | اقتراح لتحسين العمل    |
| `OTHER`             | أخرى                     | أي نوع آخر             |

---

## 🚀 الميزات

### ✅ 1. إنشاء الطلبات

- 11 نوع مختلف من الطلبات
- 4 مستويات أولوية (LOW, MEDIUM, HIGH, URGENT)
- إرفاق ملفات (attachments array)
- طلبات مالية (requestedAmount)

### ✅ 2. المراجعة والموافقة

- مراجعة من المدير/HR
- موافقة أو رفض
- إضافة ملاحظات المراجعة
- تتبع من راجع ومتى

### ✅ 3. الحالات

- **PENDING** - قيد الانتظار
- **APPROVED** - معتمد
- **REJECTED** - مرفوض
- **CANCELLED** - ملغي (من الموظف)

### ✅ 4. الأولويات

- **LOW** - منخفضة
- **MEDIUM** - متوسطة
- **HIGH** - عالية
- **URGENT** - عاجلة

---

## 📡 API Endpoints (11 endpoint)

```
POST   /hr/employee-requests                  - إنشاء طلب
GET    /hr/employee-requests                  - قائمة الطلبات
GET    /hr/employee-requests/stats            - الإحصائيات
GET    /hr/employee-requests/pending          - الطلبات قيد الانتظار
GET    /hr/employee-requests/urgent           - الطلبات العاجلة
GET    /hr/employee-requests/employee/:id     - طلبات موظف محدد
GET    /hr/employee-requests/:id              - طلب واحد
PUT    /hr/employee-requests/:id              - تحديث طلب
PUT    /hr/employee-requests/:id/review       - مراجعة طلب
PUT    /hr/employee-requests/:id/cancel       - إلغاء طلب
DELETE /hr/employee-requests/:id              - حذف طلب
```

---

## 💡 أمثلة

### 1. طلب سلفة

```json
{
  "employeeId": "emp-001",
  "type": "SALARY_ADVANCE",
  "priority": "HIGH",
  "title": "طلب سلفة على الراتب",
  "description": "أحتاج سلفة لظروف طارئة",
  "requestedAmount": 500000
}
```

### 2. طلب شهادة عمل

```json
{
  "employeeId": "emp-001",
  "type": "CERTIFICATE",
  "priority": "MEDIUM",
  "title": "شهادة راتب للبنك",
  "description": "أحتاج شهادة راتب لقرض البنك"
}
```

### 3. مراجعة طلب

```json
PUT /hr/employee-requests/{id}/review
{
  "status": "APPROVED",
  "reviewNotes": "تم الموافقة على السلفة"
}
```

---

**تم التطوير بـ ❤️ لـ iZeus ERP**
