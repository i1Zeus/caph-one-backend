# 🛡️ نظام المزايا والتأمينات - Employee Benefits System

## 🎯 نظرة عامة

نظام متكامل لإدارة مزايا وتأمينات الموظفين مع تتبع شامل للتكاليف والتغطية.

---

## 📋 أنواع المزايا (16 نوع)

### التأمينات

- 🏥 **HEALTH_INSURANCE** - تأمين صحي
- 💝 **LIFE_INSURANCE** - تأمين على الحياة
- 🦷 **DENTAL_INSURANCE** - تأمين أسنان
- 👁️ **VISION_INSURANCE** - تأمين نظر
- 👴 **PENSION** - معاش تقاعدي

### البدلات

- 💵 **ALLOWANCE** - بدل عام
- 🚗 **TRANSPORTATION** - بدل مواصلات
- 🏠 **HOUSING** - بدل سكن
- 🍽️ **MEAL_VOUCHER** - وجبات/قسائم طعام
- 📱 **PHONE_ALLOWANCE** - بدل هاتف

### المزايا الأخرى

- 💰 **BONUS** - مكافأة
- 🎓 **EDUCATION** - مساعدة تعليمية
- 💪 **GYM_MEMBERSHIP** - عضوية نادي رياضي
- 📈 **STOCK_OPTIONS** - خيارات أسهم
- 💼 **COMMISSION** - عمولة
- 📝 **OTHER** - أخرى

---

## 🚀 المميزات

✅ **16 نوع** من المزايا والتأمينات
✅ **تتبع المبالغ** - أقساط، بدلات، مكافآت
✅ **5 فترات دفع** - شهري، ربع سنوي، نصف سنوي، سنوي، مرة واحدة
✅ **تواريخ** - بداية، انتهاء، تجديد
✅ **معلومات الجهة** - جهة التأمين، رقم البوليصة
✅ **التغطية** - تفاصيل التغطية
✅ **تنبيهات** - للمزايا القريبة من الانتهاء
✅ **إحصائيات** - إجمالي التكاليف والبدلات

---

## 📡 API Endpoints (10)

```
POST   /hr/employee-benefits                  إنشاء مزية
GET    /hr/employee-benefits                  قائمة المزايا
GET    /hr/employee-benefits/stats            الإحصائيات
GET    /hr/employee-benefits/expiring         القريبة من الانتهاء
GET    /hr/employee-benefits/employee/:id     مزايا موظف
GET    /hr/employee-benefits/:id              مزية واحدة
PUT    /hr/employee-benefits/:id              تحديث
PUT    /hr/employee-benefits/:id/deactivate   تعطيل
DELETE /hr/employee-benefits/:id              حذف
```

---

## 💡 أمثلة

### 1. تأمين صحي

```json
{
  "employeeId": "emp-001",
  "type": "HEALTH_INSURANCE",
  "name": "تأمين صحي شامل",
  "provider": "شركة التأمين الوطنية",
  "policyNumber": "POL-2025-001",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "coverage": "100% للعلاج، 80% للأسنان",
  "premium": 150000
}
```

### 2. بدل مواصلات

```json
{
  "employeeId": "emp-001",
  "type": "TRANSPORTATION",
  "name": "بدل مواصلات شهري",
  "amount": 200000,
  "frequency": "MONTHLY",
  "startDate": "2025-01-01"
}
```

### 3. مكافأة سنوية

```json
{
  "employeeId": "emp-001",
  "type": "BONUS",
  "name": "مكافأة نهاية العام",
  "amount": 1000000,
  "frequency": "ONE_TIME",
  "startDate": "2025-12-31"
}
```

---

**تم التطوير بـ ❤️ لـ DevHouse ERP**
