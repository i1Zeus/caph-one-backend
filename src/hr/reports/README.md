# 📊 نظام التقارير - HR Reports System

## 🎯 نظرة عامة

نظام تقارير متقدم لقسم HR مع حسابات دقيقة للحضور والغياب والتأخير والعمل الإضافي.

---

## 📋 التقارير المتاحة (5 تقارير)

### 1. تقرير الحضور الشامل
```
GET /hr/reports/attendance?startDate=2025-10-01&endDate=2025-10-31
```

**يشمل:**
- سجلات الحضور التفصيلية لكل موظف
- إجمالي أيام الحضور والغياب
- التأخير (بالدقائق والساعات)
- العمل الإضافي
- ساعات العمل الفعلية vs المتوقعة
- معدل الحضور

### 2. تقرير التأخير
```
GET /hr/reports/late-arrivals?startDate=2025-10-01&endDate=2025-10-31
```

**يشمل:**
- الموظفون الذين تأخروا فقط
- عدد مرات التأخير
- إجمالي دقائق التأخير
- متوسط التأخير
- تفاصيل كل حالة تأخير

### 3. تقرير الغياب
```
GET /hr/reports/absence?startDate=2025-10-01&endDate=2025-10-31
```

**يشمل:**
- الموظفون الذين غابوا
- عدد أيام الغياب
- معدل الغياب
- معدل الحضور

### 4. تقرير العمل الإضافي
```
GET /hr/reports/overtime?startDate=2025-10-01&endDate=2025-10-31
```

**يشمل:**
- الموظفون الذين عملوا ساعات إضافية
- إجمالي ساعات العمل الإضافي
- متوسط العمل الإضافي
- تفاصيل كل يوم

### 5. التقرير الملخص
```
GET /hr/reports/summary?startDate=2025-10-01&endDate=2025-10-31
```

**يشمل:**
- إحصائيات عامة لجميع الموظفين
- معدلات الحضور والغياب
- إجمالي التأخير
- إجمالي العمل الإضافي
- كفاءة العمل

---

## 🎯 Query Parameters

```typescript
startDate: string   // تاريخ البداية (required) - YYYY-MM-DD
endDate: string     // تاريخ النهاية (required) - YYYY-MM-DD
employeeId?: string // موظف محدد (optional)
jobId?: string      // وظيفة محددة (optional)
```

---

## 📊 هيكل البيانات

### Attendance Report Response
```typescript
{
  employee: {
    id: string;
    firstName: string;
    lastName?: string;
    job?: { name: string };
    fingerPrintId?: string;
  };
  totalDays: number;          // إجمالي الأيام في الفترة
  presentDays: number;         // أيام الحضور
  absentDays: number;          // أيام الغياب
  lateDays: number;            // أيام التأخير
  totalLateMinutes: number;    // إجمالي دقائق التأخير
  averageLateMinutes: number;  // متوسط التأخير
  totalOvertimeMinutes: number;// إجمالي دقائق العمل الإضافي
  averageOvertimeMinutes: number; // متوسط العمل الإضافي
  totalWorkedHours: number;    // ساعات العمل الفعلية
  expectedWorkHours: number;   // ساعات العمل المتوقعة
  attendanceRate: number;      // معدل الحضور (%)
  records: [...]               // السجلات التفصيلية
}
```

---

## 💡 أمثلة الاستخدام

### 1. تقرير الحضور الشهري
```bash
GET /hr/reports/attendance?startDate=2025-10-01&endDate=2025-10-31
```

### 2. تقرير التأخير لموظف محدد
```bash
GET /hr/reports/late-arrivals?startDate=2025-10-01&endDate=2025-10-31&employeeId=emp-001
```

### 3. تقرير الغياب لوظيفة محددة
```bash
GET /hr/reports/absence?startDate=2025-10-01&endDate=2025-10-31&jobId=job-developer
```

---

## 🎨 الحسابات الدقيقة

### التأخير
```typescript
إذا كان وقت الدخول المُجدول: 09:00
والموظف دخل الساعة: 09:20
التأخير = 20 دقيقة
```

### العمل الإضافي
```typescript
إذا كان وقت الخروج المُجدول: 17:00
والموظف خرج الساعة: 19:00
العمل الإضافي = 120 دقيقة (2 ساعة)
```

### ساعات العمل
```typescript
وقت الدخول: 09:20
وقت الخروج: 17:30
ساعات العمل = 8.17 ساعة
```

### معدل الحضور
```typescript
أيام الحضور: 22 يوم
إجمالي الأيام: 30 يوم
معدل الحضور = (22 / 30) * 100 = 73.33%
```

---

## 📄 للطباعة (قريباً في Frontend)

التقارير مُصممة لتكون:
- ✅ متوافقة مع ورق A4
- ✅ أبعاد دقيقة (210mm x 297mm)
- ✅ هوامش مناسبة
- ✅ تنسيق احترافي
- ✅ دعم RTL للعربية

---

**تم التطوير بـ ❤️ لـ DevHouse ERP System**

