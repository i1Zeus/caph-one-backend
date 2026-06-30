# ⚡ البدء السريع - HR Data Seeder

## 🎯 إضافة بيانات تجريبية لقسم HR

---

## 🚀 تشغيل سريع (أمر واحد!)

```bash
cd devhouse-erp-backend
npm run seed:hr
```

**أو:**

```bash
cd devhouse-erp-backend
npx ts-node prisma/seed-hr.ts
```

---

## ✅ ما سيتم إضافته

```
💼 7 وظائف (Jobs)
👥 10 موظفين (Employees)
⏰ ~200+ سجل حضور (Attendance)
🏖️ 6 طلبات إجازة (Leaves)
💰 ~30 سجل راتب (Salaries)
```

---

## ⚠️ متطلبات

### يجب تشغيل Main Seed أولاً!

```bash
# أولاً: Main Seed
npx prisma db seed

# ثانياً: HR Seed
npm run seed:hr
```

**السبب:**
- HR Seed يحتاج workspace و super admin user

---

## 📊 البيانات التجريبية

### الموظفون (10)
```
👤 أحمد محمد       - CEO - 2,000,000 IQD
👤 سارة علي        - HR Manager - 1,500,000 IQD
👤 محمود حسن       - Senior Developer - 1,200,000 IQD
👤 نور عبدالله     - Designer - 1,100,000 IQD
👤 خالد إبراهيم     - Accountant - 1,300,000 IQD
👤 مريم حسين       - Sales - 1,000,000 IQD
👤 عمر صالح        - Developer - 1,250,000 IQD
👤 ياسمين كريم     - Support - 900,000 IQD
👤 حسام طارق       - Developer - 1,400,000 IQD
👤 لينا فاضل       - Sales (Part-time) - 700,000 IQD
```

### الوظائف (7)
```
💼 المدير التنفيذي
💼 مدير الموارد البشرية
💼 مطور برمجيات
💼 مصمم جرافيك
💼 محاسب
💼 موظف مبيعات
💼 الدعم الفني
```

### التسلسل الإداري
```
أحمد محمد (CEO)
├── سارة علي (HR Manager)
├── محمود حسن (Senior Dev)
│   ├── عمر صالح
│   └── حسام طارق
├── نور عبدالله
├── خالد إبراهيم
├── مريم حسين
└── لينا فاضل
```

---

## 🔑 مفتاح التشفير

```
Encryption Key: demo-encryption-key-2025
```

**استخدمه في:**
- عرض الرواتب
- توليد كشوف الرواتب
- أي عملية تتعلق بالرواتب

---

## 🧪 التحقق

### بعد التشغيل، تحقق في UI:

1. **الموظفون**
   ```
   http://localhost:3000/hr/employees
   ```
   **المتوقع:** 10 موظفين

2. **الوظائف**
   ```
   http://localhost:3000/hr/jobs
   ```
   **المتوقع:** 7 وظائف

3. **الحضور**
   ```
   http://localhost:3000/hr/attendance
   ```
   **المتوقع:** ~200+ سجل

4. **الإجازات**
   ```
   http://localhost:3000/hr/leaves
   ```
   **المتوقع:** 6 طلبات

5. **الرواتب**
   ```
   http://localhost:3000/hr/salaries
   ```
   **المتوقع:** ~30 سجل

---

## 🔄 إعادة التشغيل

### إعادة HR Data فقط

```bash
# 1. احذف البيانات القديمة من UI أو Prisma Studio

# 2. شغل الـ seeder مرة أخرى
npm run seed:hr
```

### إعادة كل شيء (احذر!)

```bash
# سيحذف كل البيانات!
npx prisma migrate reset

# ثم
npx prisma db seed
npm run seed:hr
```

---

## 📝 الخلاصة

```bash
# الأمر الكامل:
cd devhouse-erp-backend
npx prisma db seed          # Main seed
npm run seed:hr             # HR seed
npm run start:dev           # تشغيل Backend
```

**ثم افتح التطبيق واستمتع بالبيانات التجريبية! 🎉**

---

## 📚 المراجع

- **HR Seed File**: `prisma/seed-hr.ts`
- **Full Guide**: `HR_SEED_GUIDE.md`
- **Schema**: `prisma/schema.prisma`

---

**Happy Seeding! 🌱✨**

