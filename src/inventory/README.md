# Inventory Management System

نظام إدارة المخازن والمخزون - متقدم ومرن

## 📁 البنية

```
src/inventory/
├── inventory.module.ts          # الوحدة الرئيسية
├── inventory.controller.ts      # المتحكم الرئيسي
├── inventory.service.ts         # الخدمة الرئيسية
├── departments/                 # إدارة الأقسام
│   ├── departments.module.ts
│   ├── departments.controller.ts
│   ├── departments.service.ts
│   ├── dto/
│   │   ├── create-department.dto.ts
│   │   ├── update-department.dto.ts
│   │   └── department-query.dto.ts
│   └── entities/
│       └── department.entity.ts
├── units/                       # إدارة الوحدات
│   ├── units.module.ts
│   ├── units.controller.ts
│   ├── units.service.ts
│   ├── dto/
│   │   ├── create-unit.dto.ts
│   │   ├── update-unit.dto.ts
│   │   └── unit-query.dto.ts
│   └── entities/
│       └── unit.entity.ts
├── warehouses/                  # إدارة المخازن
│   ├── warehouses.module.ts
│   ├── warehouses.controller.ts
│   ├── warehouses.service.ts
│   ├── dto/
│   │   ├── create-warehouse.dto.ts
│   │   ├── update-warehouse.dto.ts
│   │   └── warehouse-query.dto.ts
│   └── entities/
│       └── warehouse.entity.ts
├── stock/                       # إدارة المخزون
│   ├── stock.module.ts
│   ├── stock.controller.ts
│   ├── stock.service.ts
│   ├── dto/
│   │   ├── create-stock.dto.ts
│   │   ├── update-stock.dto.ts
│   │   ├── stock-query.dto.ts
│   │   ├── stock-transfer.dto.ts
│   │   └── stock-adjustment.dto.ts
│   └── entities/
│       └── stock.entity.ts
├── warehouse-transactions/      # إدارة حركات المخزن
│   ├── warehouse-transactions.module.ts
│   ├── warehouse-transactions.controller.ts
│   ├── warehouse-transactions.service.ts
│   ├── dto/
│   │   ├── create-warehouse-transaction.dto.ts
│   │   ├── update-warehouse-transaction.dto.ts
│   │   ├── warehouse-transaction-query.dto.ts
│   │   └── warehouse-transaction-status.dto.ts
│   └── entities/
│       └── warehouse-transaction.entity.ts
└── products/                    # إدارة المنتجات (قيد الإنشاء)
```

## 🚀 API Endpoints

### Departments (الأقسام)

```
POST   /departments              # إنشاء قسم جديد
GET    /departments              # قائمة الأقسام (مع pagination & search)
GET    /departments/:id          # قسم محدد
GET    /departments/:id/warehouses # مخازن القسم
GET    /departments/:id/stats    # إحصائيات القسم
PATCH  /departments/:id          # تحديث قسم
DELETE /departments/:id          # حذف قسم (soft delete)
```

### Units (الوحدات)

```
POST   /units                    # إنشاء وحدة جديدة
GET    /units                    # قائمة الوحدات (مع pagination & search)
GET    /units/stats              # إحصائيات الوحدات
GET    /units/:id                # وحدة محددة
GET    /units/:id/products       # منتجات الوحدة
PATCH  /units/:id                # تحديث وحدة
DELETE /units/:id                # حذف وحدة (soft delete)
```

### Warehouses (المخازن)

```
POST   /warehouses               # إنشاء مخزن جديد
GET    /warehouses               # قائمة المخازن (مع pagination & search)
GET    /warehouses/stats         # إحصائيات المخازن
GET    /warehouses/:id           # مخزن محدد
GET    /warehouses/:id/hierarchy # الهيكل الهرمي للمخزن
GET    /warehouses/:id/stock     # مخزون المخزن
PATCH  /warehouses/:id           # تحديث مخزن
DELETE /warehouses/:id           # حذف مخزن (soft delete)
```

### Stock (المخزون)

```
POST   /stock                    # إنشاء مخزون جديد
GET    /stock                    # قائمة المخزون (مع pagination & search)
GET    /stock/stats              # إحصائيات المخزون
GET    /stock/low-stock          # المنتجات منخفضة المخزون
GET    /stock/out-of-stock       # المنتجات المنتهية المخزون
GET    /stock/:id                # مخزون محدد
GET    /stock/product/:id/warehouse/:id # مخزون منتج في مخزن محدد
POST   /stock/transfer           # نقل مخزون بين المخازن
POST   /stock/adjust             # تعديل المخزون
PATCH  /stock/:id                # تحديث مخزون
DELETE /stock/:id                # حذف مخزون
```

### Warehouse Transactions (حركات المخزن)

```
POST   /warehouse-transactions   # إنشاء حركة جديدة
GET    /warehouse-transactions   # قائمة الحركات (مع pagination & search)
GET    /warehouse-transactions/stats # إحصائيات الحركات
GET    /warehouse-transactions/product/:id/history # تاريخ حركات منتج
GET    /warehouse-transactions/warehouse/:id/history # تاريخ حركات مخزن
GET    /warehouse-transactions/daily/:date # حركات يوم محدد
GET    /warehouse-transactions/:id # حركة محددة
PATCH  /warehouse-transactions/:id # تحديث حركة
PATCH  /warehouse-transactions/:id/status # تحديث حالة الحركة
DELETE /warehouse-transactions/:id # حذف حركة
```

## 📊 مثال على الاستخدام

### إنشاء قسم جديد

```typescript
POST /departments
{
  "name": "الصيدلية",
  "description": "قسم الصيدلية الرئيسي",
  "isActive": true
}
```

### إنشاء وحدة جديدة

```typescript
POST /units
{
  "name": "قطعة",
  "symbol": "pc",
  "description": "قطعة واحدة",
  "isActive": true
}
```

### البحث في الأقسام

```typescript
GET /departments?search=صيدلية&page=1&limit=10&isActive=true
```

### البحث في الوحدات

```typescript
GET /units?search=قطعة&page=1&limit=10&isActive=true
```

### إنشاء مخزن جديد

```typescript
POST /warehouses
{
  "name": "مخزن الصيدلية الرئيسي",
  "departmentId": 1,
  "location": "الطابق الأول",
  "description": "المخزن الرئيسي للصيدلية",
  "isActive": true
}
```

### إنشاء مخزن فرعي

```typescript
POST /warehouses
{
  "name": "خزانة الأدوية",
  "parentId": 1,
  "location": "الطابق الأول - الغرفة 101",
  "description": "خزانة خاصة بالأدوية الحساسة",
  "isActive": true
}
```

### البحث في المخازن

```typescript
GET /warehouses?search=صيدلية&departmentId=1&hasParent=false&page=1&limit=10
```

### إنشاء مخزون جديد

```typescript
POST /stock
{
  "productId": 1,
  "warehouseId": 1,
  "quantity": 100,
  "reorderLevel": 20
}
```

### نقل مخزون بين المخازن

```typescript
POST /stock/transfer
{
  "productId": 1,
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "quantity": 50,
  "note": "نقل مخزون للصيدلية"
}
```

### تعديل المخزون

```typescript
POST /stock/adjust
{
  "productId": 1,
  "warehouseId": 1,
  "type": "INCREASE",
  "quantity": 25,
  "reason": "تسوية جرد"
}
```

### البحث في المخزون

```typescript
GET /stock?search=أسبرين&warehouseId=1&lowStock=true&page=1&limit=10
```

### إنشاء حركة شراء

```typescript
POST /warehouse-transactions
{
  "type": "PURCHASE",
  "productId": 1,
  "toWarehouseId": 1,
  "quantity": 100,
  "unitPrice": 5.50,
  "totalPrice": 550,
  "note": "شراء أسبرين من المورد",
  "status": "COMPLETED"
}
```

### إنشاء حركة بيع

```typescript
POST /warehouse-transactions
{
  "type": "SALE",
  "productId": 1,
  "fromWarehouseId": 1,
  "quantity": 10,
  "unitPrice": 7.00,
  "totalPrice": 70,
  "note": "بيع للعميل أحمد",
  "status": "COMPLETED"
}
```

### إنشاء حركة نقل

```typescript
POST /warehouse-transactions
{
  "type": "TRANSFER",
  "productId": 1,
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "quantity": 50,
  "note": "نقل للصيدلية",
  "status": "COMPLETED"
}
```

### البحث في الحركات

```typescript
GET /warehouse-transactions?type=PURCHASE&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=10
```

## 🌟 المميزات

### Departments

- ✅ CRUD كامل للأقسام
- 🔍 بحث متقدم بالاسم والوصف
- 📄 Pagination للنتائج
- ✅ Validation للبيانات
- ⚡ Soft Delete آمن
- 📊 إحصائيات شاملة
- 🏪 ربط بالمخازن

### Units

- ✅ CRUD كامل للوحدات
- 🔍 بحث متقدم بالاسم والرمز والوصف
- 📄 Pagination للنتائج
- ✅ Validation للبيانات
- ⚡ Soft Delete آمن مع التحقق من الاستخدام
- 📊 إحصائيات شاملة
- 📦 ربط بالمنتجات

### Warehouses

- ✅ CRUD كامل للمخازن
- 🏗️ هيكل هرمي متداخل (مخازن رئيسية وفرعية)
- 🔍 بحث متقدم بالاسم والموقع والوصف
- 📄 Pagination للنتائج
- ✅ Validation للبيانات مع التحقق من الحلقات
- ⚡ Soft Delete آمن مع التحقق من المخزون والأطفال
- 📊 إحصائيات شاملة
- 🏪 ربط بالأقسام والمخازن الأخرى
- 📦 عرض المخزون مع القيمة المقدرة
- 🌳 عرض الهيكل الهرمي الكامل

### Stock

- ✅ CRUD كامل للمخزون
- 🔄 نقل المخزون بين المخازن (مع transactions)
- ⚖️ تعديل المخزون (زيادة/تقليل/تعيين)
- 🔍 بحث متقدم بالمنتج والمخزن والقسم
- 📄 Pagination للنتائج
- ✅ Validation للبيانات مع التحقق من الكميات
- ⚡ حذف آمن مع التحقق من الحركات
- 📊 إحصائيات شاملة
- 🚨 تنبيهات المخزون المنخفض والمنتهي
- 💰 حساب القيمة الإجمالية للمخزون
- 📦 ربط بالمنتجات والمخازن
- 🔄 تتبع الحركات والتعديلات

### Warehouse Transactions

- ✅ CRUD كامل لحركات المخزن
- 🛒 أنواع حركات متعددة (شراء، بيع، نقل، تعديل، استهلاك)
- 🔍 بحث متقدم بالمنتج والمخزن والقسم والتاريخ
- 📄 Pagination للنتائج
- ✅ Validation للبيانات مع التحقق من أنواع الحركات
- ⚡ إدارة الحالات (معلق، مكتمل، ملغي)
- 📊 إحصائيات شاملة حسب النوع والحالة
- 📈 تتبع تاريخ الحركات للمنتجات والمخازن
- 📅 عرض الحركات اليومية
- 💰 حساب القيم الإجمالية
- 🔄 ربط بالمنتجات والمخازن
- 📝 ملاحظات وتفاصيل الحركات

## 🔧 التثبيت والتشغيل

1. **توليد Prisma Client:**

```bash
npx prisma generate
```

2. **تطبيق التغييرات على قاعدة البيانات:**

```bash
npx prisma db push
```

3. **تشغيل الخادم:**

```bash
npm run start:dev
```

## 📝 ملاحظات

- جميع العمليات تستخدم Soft Delete للحفاظ على سلامة البيانات
- يتم التحقق من الاستخدام قبل الحذف
- النظام يدعم البحث المتقدم والتصفية
- جميع الاستجابات تحتوي على pagination
- يتم تسجيل جميع العمليات في Audit Log
