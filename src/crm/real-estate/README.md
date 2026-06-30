# 🏢 Real Estate Module

## Overview

The Real Estate module is a comprehensive sub-module within the CRM system that manages properties, offers, and contracts for real estate companies.

## Structure

```
src/crm/real-estate/
├── dto/                           # Data Transfer Objects
│   ├── create-property.dto.ts
│   ├── update-property.dto.ts
│   ├── create-property-offer.dto.ts
│   ├── update-property-offer.dto.ts
│   ├── create-property-contract.dto.ts
│   ├── update-property-contract.dto.ts
│   └── index.ts
├── entities/                      # Entity definitions
│   ├── property.entity.ts
│   ├── property-offer.entity.ts
│   ├── property-contract.entity.ts
│   └── index.ts
├── property.service.ts            # Property business logic
├── property-offer.service.ts      # Offer business logic
├── property-contract.service.ts   # Contract business logic
├── property.controller.ts         # Property HTTP endpoints
├── property-offer.controller.ts   # Offer HTTP endpoints
├── property-contract.controller.ts # Contract HTTP endpoints
├── real-estate.module.ts          # Module definition
├── index.ts                       # Module exports
├── REAL_ESTATE_API.md            # API documentation
└── README.md                      # This file
```

## Features

### 🏠 Property Management

- Create and manage properties (apartments, villas, lands, shops, offices, warehouses, buildings, farms)
- Track property details (location, area, bedrooms, bathrooms, price)
- Upload images and documents
- Monitor property status (available, reserved, sold, rented)
- Get property statistics

### 📋 Offer Management

- Receive and manage property offers from clients
- Track offer status (pending, accepted, rejected, expired)
- Set offer validity dates
- Convert accepted offers to contracts
- Accept/reject offers via dedicated endpoints

### 📝 Contract Management

- Create property contracts (sale, purchase, rent, lease)
- Link contracts to original offers
- Manage contract lifecycle (draft → active → completed)
- Cancel contracts when needed
- Link contracts to invoices for payment tracking
- Get contract statistics

## Installation

This module is already integrated into the CRM module. No additional installation is required.

## Usage

### Import the Module

The Real Estate module is automatically imported in `CrmModule`:

```typescript
import { RealEstateModule } from './real-estate/real-estate.module';

@Module({
  imports: [RealEstateModule],
})
export class CrmModule {}
```

### Use Services

```typescript
import {
  PropertyService,
  PropertyOfferService,
  PropertyContractService,
} from './crm/real-estate';

@Injectable()
export class YourService {
  constructor(
    private propertyService: PropertyService,
    private offerService: PropertyOfferService,
    private contractService: PropertyContractService,
  ) {}

  async example() {
    // Get all available properties
    const properties = await this.propertyService.findAll({
      status: PropertyStatus.AVAILABLE,
    });

    // Get property statistics
    const stats = await this.propertyService.getStatistics();
  }
}
```

## API Endpoints

All endpoints are prefixed with `/api/crm`

### Properties

- `POST /crm/properties` - Create property
- `GET /crm/properties` - Get all properties (with filters)
- `GET /crm/properties/statistics` - Get statistics
- `GET /crm/properties/:id` - Get property by ID
- `PATCH /crm/properties/:id` - Update property
- `DELETE /crm/properties/:id` - Delete property

### Property Offers

- `POST /crm/property-offers` - Create offer
- `GET /crm/property-offers` - Get all offers (with filters)
- `GET /crm/property-offers/:id` - Get offer by ID
- `PATCH /crm/property-offers/:id` - Update offer
- `DELETE /crm/property-offers/:id` - Delete offer
- `POST /crm/property-offers/:id/accept` - Accept offer
- `POST /crm/property-offers/:id/reject` - Reject offer

### Property Contracts

- `POST /crm/property-contracts` - Create contract
- `GET /crm/property-contracts` - Get all contracts (with filters)
- `GET /crm/property-contracts/statistics` - Get statistics
- `GET /crm/property-contracts/:id` - Get contract by ID
- `PATCH /crm/property-contracts/:id` - Update contract
- `DELETE /crm/property-contracts/:id` - Delete contract
- `POST /crm/property-contracts/:id/activate` - Activate contract
- `POST /crm/property-contracts/:id/complete` - Complete contract
- `POST /crm/property-contracts/:id/cancel` - Cancel contract

For detailed API documentation, see [REAL_ESTATE_API.md](./REAL_ESTATE_API.md)

## Business Logic

### Property Workflow

```
1. Create Property → Status: AVAILABLE
2. Receive Offer → Offer Status: PENDING
3. Accept Offer → Offer Status: ACCEPTED
4. Create Contract → Contract Status: DRAFT, Property Status: RESERVED
5. Activate Contract → Contract Status: ACTIVE, Property Status: SOLD/RENTED
6. Complete Contract → Contract Status: COMPLETED
```

### Validation Rules

#### Properties

- Title is required
- Property type must be valid enum value
- Price and area must be positive numbers if provided

#### Offers

- Property and client must exist
- Offer amount must be positive
- Valid until date must be in the future

#### Contracts

- Contract number must be unique
- Property and client must exist
- Contract amount must be positive
- Start date is required
- Cannot delete contracts with invoices
- Only draft contracts can be activated
- Only active contracts can be completed
- Cannot cancel completed contracts

### Side Effects

#### Creating Contract

- Property status → RESERVED
- If linked to offer: Offer status → CONVERTED_TO_CONTRACT

#### Activating Contract

- Contract status → ACTIVE
- Property status → SOLD (for SALE/PURCHASE) or RENTED (for RENT/LEASE)

#### Canceling Contract

- Contract status → CANCELLED
- Property status → AVAILABLE

## Database Models

### Property

```prisma
model Property {
  id            Int
  title         String
  propertyType  PropertyType
  address       String?
  city          String?
  area          Decimal?
  bedrooms      Int?
  bathrooms     Int?
  price         Decimal?
  status        PropertyStatus
  images        String[]
  documents     String[]
  offers        PropertyOffer[]
  contracts     PropertyContract[]
}
```

### PropertyOffer

```prisma
model PropertyOffer {
  id                  Int
  propertyId          Int
  clientId            Int
  offerType           ContractType
  offerAmount         Decimal
  status              OfferStatus
  validUntil          DateTime?
  convertedToContract PropertyContract?
}
```

### PropertyContract

```prisma
model PropertyContract {
  id              Int
  contractNumber  String @unique
  propertyId      Int
  clientId        Int
  offerId         Int?
  contractType    ContractType
  contractAmount  Decimal
  startDate       DateTime
  endDate         DateTime?
  status          ContractStatus
  invoices        SalesInvoice[]
}
```

## Testing

```bash
# Unit tests
npm run test -- real-estate

# E2E tests
npm run test:e2e -- real-estate

# Coverage
npm run test:cov
```

## Integration with Other Modules

### Accounting

Contracts can be linked to sales invoices for payment tracking:

```typescript
// Create invoice linked to contract
await accountingService.createSalesInvoice({
  propertyContractId: contract.id,
  clientId: contract.clientId,
  totalAmount: contract.contractAmount,
  // ...
});
```

### CRM

Uses the existing Client model from the CRM/Accounting system.

## Permissions

Recommended permissions for RBAC:

```typescript
// Properties
'properties:create';
'properties:read';
'properties:update';
'properties:delete';

// Offers
'property-offers:create';
'property-offers:read';
'property-offers:update';
'property-offers:delete';
'property-offers:accept';
'property-offers:reject';

// Contracts
'property-contracts:create';
'property-contracts:read';
'property-contracts:update';
'property-contracts:delete';
'property-contracts:activate';
'property-contracts:complete';
'property-contracts:cancel';
```

## Audit Trail

All endpoints are decorated with `@AutoAudit()` for automatic audit logging:

- Property operations logged as `Real Estate - Properties`
- Offer operations logged as `Real Estate - Offers`
- Contract operations logged as `Real Estate - Contracts`

## Future Enhancements

- [ ] Property comparison feature
- [ ] Virtual tours integration
- [ ] Google Maps integration
- [ ] Automatic contract expiry notifications
- [ ] Property valuation calculator
- [ ] Document template generator
- [ ] SMS/Email notifications
- [ ] Mobile app support
- [ ] Advanced search filters
- [ ] Property favorites/watchlist

## Support

For issues or questions:

1. Check the [API documentation](./REAL_ESTATE_API.md)
2. Review the main [Real Estate Documentation](../../../REAL_ESTATE_README.md)
3. Contact the development team

---

**Version:** 1.0.0  
**Author:** iZeus Team  
**Last Updated:** 2025-10-14
