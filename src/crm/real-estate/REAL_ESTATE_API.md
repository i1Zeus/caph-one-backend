# Real Estate API Documentation

## Base URL
```
/api/crm
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

---

## Properties Endpoints

### 1. Create Property
**POST** `/crm/properties`

**Request Body:**
```json
{
  "title": "فيلا فاخرة في الجادرية",
  "description": "فيلا حديثة البناء مع حديقة",
  "propertyType": "VILLA",
  "address": "بغداد - الجادرية - شارع 14",
  "city": "بغداد",
  "district": "الجادرية",
  "coordinates": "33.2824,44.3658",
  "area": 350.50,
  "areaUnit": "m²",
  "bedrooms": 4,
  "bathrooms": 3,
  "floors": 2,
  "parkingSpaces": 2,
  "yearBuilt": 2023,
  "price": 450000000,
  "pricePerMeter": 1284000,
  "status": "AVAILABLE",
  "images": ["url1", "url2"],
  "documents": ["url1", "url2"],
  "features": "مسبح خاص، نظام أمني",
  "notes": "جاهز للسكن الفوري"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "title": "فيلا فاخرة في الجادرية",
  ...
}
```

---

### 2. Get All Properties
**GET** `/crm/properties`

**Query Parameters:**
- `propertyType` (optional): APARTMENT | VILLA | LAND | SHOP | OFFICE | WAREHOUSE | BUILDING | FARM | OTHER
- `status` (optional): AVAILABLE | RESERVED | SOLD | RENTED | UNDER_MAINTENANCE | UNAVAILABLE
- `city` (optional): string
- `minPrice` (optional): number
- `maxPrice` (optional): number

**Example:**
```
GET /crm/properties?status=AVAILABLE&city=بغداد&minPrice=100000000&maxPrice=500000000
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "فيلا فاخرة في الجادرية",
    "propertyType": "VILLA",
    "price": 450000000,
    "status": "AVAILABLE",
    "offers": [...],
    "contracts": [...]
  }
]
```

---

### 3. Get Property Statistics
**GET** `/crm/properties/statistics`

**Response:** `200 OK`
```json
{
  "totalProperties": 50,
  "availableProperties": 30,
  "soldProperties": 15,
  "rentedProperties": 5,
  "totalValue": 15000000000,
  "byType": [
    { "propertyType": "VILLA", "_count": 20 },
    { "propertyType": "APARTMENT", "_count": 30 }
  ],
  "byStatus": [
    { "status": "AVAILABLE", "_count": 30 },
    { "status": "SOLD", "_count": 15 }
  ]
}
```

---

### 4. Get Property by ID
**GET** `/crm/properties/:id`

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "فيلا فاخرة في الجادرية",
  "description": "...",
  "offers": [
    {
      "id": 1,
      "client": {...},
      "offerAmount": 430000000,
      "status": "ACCEPTED"
    }
  ],
  "contracts": [
    {
      "id": 1,
      "client": {...},
      "contractAmount": 430000000,
      "invoices": [...]
    }
  ]
}
```

---

### 5. Update Property
**PATCH** `/crm/properties/:id`

**Request Body:** (partial update)
```json
{
  "status": "SOLD",
  "price": 440000000
}
```

**Response:** `200 OK`

---

### 6. Delete Property
**DELETE** `/crm/properties/:id`

**Response:** `204 No Content`

---

## Property Offers Endpoints

### 1. Create Property Offer
**POST** `/crm/property-offers`

**Request Body:**
```json
{
  "propertyId": 1,
  "clientId": 5,
  "offerType": "SALE",
  "offerAmount": 430000000,
  "status": "PENDING",
  "validUntil": "2025-11-01T23:59:59Z",
  "notes": "العميل جاد ومستعد للدفع نقداً",
  "terms": "دفعة أولى 30% والباقي على دفعتين"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "propertyId": 1,
  "clientId": 5,
  "property": {...},
  "client": {...},
  "offerAmount": 430000000,
  "status": "PENDING"
}
```

---

### 2. Get All Property Offers
**GET** `/crm/property-offers`

**Query Parameters:**
- `propertyId` (optional): number
- `clientId` (optional): number
- `status` (optional): PENDING | ACCEPTED | REJECTED | EXPIRED | CONVERTED_TO_CONTRACT

**Example:**
```
GET /crm/property-offers?status=PENDING
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "property": {...},
    "client": {...},
    "offerAmount": 430000000,
    "status": "PENDING",
    "convertedToContract": null
  }
]
```

---

### 3. Get Property Offer by ID
**GET** `/crm/property-offers/:id`

**Response:** `200 OK`

---

### 4. Update Property Offer
**PATCH** `/crm/property-offers/:id`

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Response:** `200 OK`

---

### 5. Delete Property Offer
**DELETE** `/crm/property-offers/:id`

**Response:** `204 No Content`

---

### 6. Accept Offer
**POST** `/crm/property-offers/:id/accept`

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "ACCEPTED",
  ...
}
```

---

### 7. Reject Offer
**POST** `/crm/property-offers/:id/reject`

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "REJECTED",
  ...
}
```

---

## Property Contracts Endpoints

### 1. Create Property Contract
**POST** `/crm/property-contracts`

**Request Body:**
```json
{
  "contractNumber": "CNT-2025-001",
  "propertyId": 1,
  "clientId": 5,
  "offerId": 1,
  "contractType": "SALE",
  "contractAmount": 430000000,
  "startDate": "2025-10-15T00:00:00Z",
  "endDate": null,
  "status": "DRAFT",
  "terms": "شروط العقد...",
  "notes": "ملاحظات...",
  "documents": ["url1", "url2"]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "contractNumber": "CNT-2025-001",
  "property": {...},
  "client": {...},
  "offer": {...},
  "contractAmount": 430000000,
  "status": "DRAFT"
}
```

**Side Effects:**
- Property status changed to "RESERVED"
- If offerId provided, offer status changed to "CONVERTED_TO_CONTRACT"

---

### 2. Get All Property Contracts
**GET** `/crm/property-contracts`

**Query Parameters:**
- `propertyId` (optional): number
- `clientId` (optional): number
- `status` (optional): DRAFT | ACTIVE | COMPLETED | CANCELLED | EXPIRED
- `contractType` (optional): SALE | PURCHASE | RENT | LEASE

**Example:**
```
GET /crm/property-contracts?status=ACTIVE&contractType=SALE
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "contractNumber": "CNT-2025-001",
    "property": {...},
    "client": {...},
    "contractAmount": 430000000,
    "status": "ACTIVE",
    "invoices": [...]
  }
]
```

---

### 3. Get Contract Statistics
**GET** `/crm/property-contracts/statistics`

**Response:** `200 OK`
```json
{
  "totalContracts": 20,
  "activeContracts": 10,
  "completedContracts": 8,
  "draftContracts": 2,
  "totalValue": 5000000000,
  "byType": [
    { "contractType": "SALE", "_count": 15 },
    { "contractType": "RENT", "_count": 5 }
  ],
  "byStatus": [
    { "status": "ACTIVE", "_count": 10 },
    { "status": "COMPLETED", "_count": 8 }
  ]
}
```

---

### 4. Get Property Contract by ID
**GET** `/crm/property-contracts/:id`

**Response:** `200 OK`
```json
{
  "id": 1,
  "contractNumber": "CNT-2025-001",
  "property": {...},
  "client": {...},
  "offer": {...},
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-2025-001",
      "totalAmount": 129000000,
      "paidAmount": 129000000,
      "status": "PAID"
    }
  ]
}
```

---

### 5. Update Property Contract
**PATCH** `/crm/property-contracts/:id`

**Request Body:**
```json
{
  "status": "ACTIVE",
  "notes": "تم التوقيع"
}
```

**Response:** `200 OK`

---

### 6. Delete Property Contract
**DELETE** `/crm/property-contracts/:id`

**Response:** `204 No Content`

**Note:** Cannot delete contracts that have invoices.

---

### 7. Activate Contract
**POST** `/crm/property-contracts/:id/activate`

**Response:** `200 OK`

**Side Effects:**
- Contract status changed to "ACTIVE"
- Property status changed to "SOLD" (for SALE/PURCHASE) or "RENTED" (for RENT/LEASE)

**Validation:**
- Only DRAFT contracts can be activated

---

### 8. Complete Contract
**POST** `/crm/property-contracts/:id/complete`

**Response:** `200 OK`

**Side Effects:**
- Contract status changed to "COMPLETED"

**Validation:**
- Only ACTIVE contracts can be completed

---

### 9. Cancel Contract
**POST** `/crm/property-contracts/:id/cancel`

**Response:** `200 OK`

**Side Effects:**
- Contract status changed to "CANCELLED"
- Property status changed back to "AVAILABLE"

**Validation:**
- Cannot cancel COMPLETED contracts

---

## Property Types

```typescript
enum PropertyType {
  APARTMENT   // شقة
  VILLA       // فيلا
  LAND        // أرض
  SHOP        // محل تجاري
  OFFICE      // مكتب
  WAREHOUSE   // مستودع
  BUILDING    // عمارة
  FARM        // مزرعة
  OTHER       // أخرى
}
```

## Property Status

```typescript
enum PropertyStatus {
  AVAILABLE          // متاح
  RESERVED           // محجوز
  SOLD               // مباع
  RENTED             // مؤجر
  UNDER_MAINTENANCE  // تحت الصيانة
  UNAVAILABLE        // غير متاح
}
```

## Offer Status

```typescript
enum OfferStatus {
  PENDING                // قيد الانتظار
  ACCEPTED               // مقبول
  REJECTED               // مرفوض
  EXPIRED                // منتهي
  CONVERTED_TO_CONTRACT  // تم تحويله لعقد
}
```

## Contract Type

```typescript
enum ContractType {
  SALE     // بيع
  PURCHASE // شراء
  RENT     // إيجار
  LEASE    // استئجار
}
```

## Contract Status

```typescript
enum ContractStatus {
  DRAFT      // مسودة
  ACTIVE     // نشط
  COMPLETED  // مكتمل
  CANCELLED  // ملغي
  EXPIRED    // منتهي
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Property with ID 1 not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Contract number already exists",
  "error": "Conflict"
}
```

---

## Workflow Example

### Complete Sale Workflow

1. **Create Property**
   ```
   POST /crm/properties
   ```

2. **Receive Offer**
   ```
   POST /crm/property-offers
   ```

3. **Accept Offer**
   ```
   POST /crm/property-offers/:id/accept
   ```

4. **Create Contract**
   ```
   POST /crm/property-contracts
   ```

5. **Activate Contract**
   ```
   POST /crm/property-contracts/:id/activate
   ```

6. **Create Invoices** (via Accounting API)
   ```
   POST /api/accounting/sales-invoices
   {
     "propertyContractId": 1,
     ...
   }
   ```

7. **Complete Contract**
   ```
   POST /crm/property-contracts/:id/complete
   ```

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-14

