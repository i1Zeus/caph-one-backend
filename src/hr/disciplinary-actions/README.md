# ⚠️ نظام الإنذارات والجزاءات - Disciplinary Actions System

## 🎯 نظرة عامة

نظام متكامل لإدارة الإنذارات والجزاءات للموظفين مع دعم التصعيد التدريجي والتتبع الشامل.

---

## 🏗️ البنية

```
disciplinary-actions/
├── dto/
│   ├── create-disciplinary-action.dto.ts    # DTO لإنشاء إجراء
│   ├── update-disciplinary-action.dto.ts    # DTO لتحديث إجراء
│   ├── get-disciplinary-actions.dto.ts      # DTO للبحث والتصفية
│   └── index.ts
├── disciplinary-actions.service.ts           # منطق العمل
├── disciplinary-actions.controller.ts        # REST API endpoints
├── disciplinary-actions.module.ts            # NestJS Module
├── index.ts
├── DISCIPLINARY_ACTIONS_GUIDE.md            # دليل شامل
└── README.md                                # هذا الملف
```

---

## ✨ المميزات

### 🎯 الأنواع (8 أنواع)
- ⚠️ إنذار شفهي
- 📝 إنذار كتابي
- 🚨 إنذار نهائي
- 💰 خصم من الراتب
- ⏸️ إيقاف عن العمل
- ⬇️ تخفيض الدرجة
- ❌ فصل من العمل
- 📋 ملاحظة

### 📊 مستويات الخطورة (4 مستويات)
- 🟢 LOW - بسيط
- 🟡 MEDIUM - متوسط
- 🟠 HIGH - عالي
- 🔴 CRITICAL - حرج جداً

### 📑 الفئات (8 فئات)
- BEHAVIORAL - سلوكي
- ATTENDANCE - الحضور
- PERFORMANCE - الأداء
- POLICY_VIOLATION - انتهاك السياسات
- SAFETY - السلامة
- FINANCIAL - مالي
- MISCONDUCT - سوء السلوك المهني
- OTHER - أخرى

### 🔄 الحالات (4 حالات)
- ACTIVE - نشط
- RESOLVED - تم حله
- APPEALED - تم الاستئناف
- CANCELLED - ملغي

---

## 🚀 البدء السريع

### 1. إنشاء إجراء تأديبي
```bash
curl -X POST http://localhost:3000/hr/disciplinary-actions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp-uuid",
    "type": "WRITTEN_WARNING",
    "severity": "MEDIUM",
    "category": "ATTENDANCE",
    "title": "تأخير متكرر",
    "reason": "تأخر 5 مرات هذا الشهر",
    "actionDate": "2025-10-07"
  }'
```

### 2. الحصول على سجل موظف
```bash
curl http://localhost:3000/hr/disciplinary-actions/employee/{employeeId}/history \
  -H "Authorization: Bearer TOKEN"
```

### 3. الإجراءات الحرجة
```bash
curl http://localhost:3000/hr/disciplinary-actions/critical \
  -H "Authorization: Bearer TOKEN"
```

---

## 📡 API Endpoints (11 endpoint)

```
POST   /hr/disciplinary-actions                       - إنشاء إجراء
GET    /hr/disciplinary-actions                       - قائمة الإجراءات
GET    /hr/disciplinary-actions/stats                 - الإحصائيات
GET    /hr/disciplinary-actions/critical              - الإجراءات الحرجة
GET    /hr/disciplinary-actions/multiple-warnings     - الموظفون بإنذارات متعددة
GET    /hr/disciplinary-actions/employee/:id          - إجراءات موظف
GET    /hr/disciplinary-actions/employee/:id/history  - سجل موظف كامل
GET    /hr/disciplinary-actions/:id                   - إجراء واحد
PUT    /hr/disciplinary-actions/:id                   - تحديث إجراء
PUT    /hr/disciplinary-actions/:id/resolve           - حل/إغلاق إجراء
DELETE /hr/disciplinary-actions/:id                   - حذف إجراء
```

---

## 🎨 Use Cases

### 1. نظام التصعيد الآلي
```typescript
async function handleLateArrival(employeeId: string) {
  // احسب عدد مرات التأخير هذا الشهر
  const lateCount = await countLateArrivals(employeeId);
  
  if (lateCount === 1) {
    // إنذار شفهي
    await createAction({
      type: 'VERBAL_WARNING',
      severity: 'LOW',
      category: 'ATTENDANCE',
      title: 'تأخير عن العمل - المرة الأولى',
      reason: `تأخر عن العمل (${lateCount} مرة هذا الشهر)`
    });
  } else if (lateCount === 3) {
    // إنذار كتابي
    await createAction({
      type: 'WRITTEN_WARNING',
      severity: 'MEDIUM',
      category: 'ATTENDANCE',
      title: 'تأخير متكرر',
      reason: `تأخر عن العمل (${lateCount} مرات هذا الشهر)`
    });
  } else if (lateCount === 5) {
    // خصم من الراتب
    await createAction({
      type: 'SALARY_DEDUCTION',
      severity: 'HIGH',
      category: 'ATTENDANCE',
      title: 'تأخير مستمر',
      reason: `تأخر عن العمل (${lateCount} مرات هذا الشهر)`,
      deductionDays: 1
    });
  }
}
```

### 2. تقرير أسبوعي للـ HR
```typescript
async function weeklyHRReport() {
  const lastWeek = {
    startDate: getLastWeekStart(),
    endDate: getLastWeekEnd()
  };
  
  const [actions, stats, critical] = await Promise.all([
    findAll({ startDate: lastWeek.startDate, endDate: lastWeek.endDate }),
    getStats(),
    getCriticalActions()
  ]);
  
  return {
    summary: `${actions.total} إجراء جديد الأسبوع الماضي`,
    actions: actions.actions,
    criticalCount: critical.length,
    mostCommonCategory: findMostCommon(stats.byCategory)
  };
}
```

---

## 🔧 الإعداد والتثبيت

### Migration
```bash
npx prisma migrate dev --name add_disciplinary_actions_system
npx prisma generate
```

### Integration
النظام مُدمج تلقائياً في HR Module ✅

---

## 📚 التوثيق الكامل

للحصول على التوثيق الكامل مع الأمثلة التفصيلية:
👉 راجع ملف [`DISCIPLINARY_ACTIONS_GUIDE.md`](./DISCIPLINARY_ACTIONS_GUIDE.md)

---

**صُنع بـ ❤️ من أجل DevHouse ERP System**

