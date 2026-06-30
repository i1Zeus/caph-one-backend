import { Property as PrismaProperty } from '@prisma/client';

export class Property implements PrismaProperty {
  id: number;
  title: string;
  description: string | null;
  propertyType: any;
  address: string | null;
  city: string | null;
  district: string | null;
  coordinates: string | null;
  area: any | null;
  areaUnit: string | null;

  // Dimensions
  length: any | null;
  width: any | null;
  height: any | null;

  // Detailed Areas
  builtUpArea: any | null;
  gardenArea: any | null;
  buildingToLandRatio: any | null;

  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  parkingSpaces: number | null;
  yearBuilt: number | null;

  // Construction Details
  buildingAge: number | null;
  finishingType: string | null;
  structureType: string | null;
  flooringType: string | null;
  windowType: string | null;
  doorType: string | null;

  // Utilities
  acSystem: string | null;
  heatingSystem: string | null;
  thermalInsulation: boolean | null;
  soundInsulation: boolean | null;
  waterproofing: boolean | null;
  waterSource: string | null;
  electricityType: string | null;
  internetType: string | null;
  securitySystem: string | null;

  // Additional Features
  elevators: number | null;
  hasSwimmingPool: boolean | null;
  hasGym: boolean | null;
  hasMaidRoom: boolean | null;
  hasStorage: boolean | null;
  balconies: number | null;
  balconyArea: any | null;
  view: string | null;
  direction: string | null;

  // Legal Information
  deedNumber: string | null;
  planNumber: string | null;
  plotNumber: string | null;
  nearbyServices: any | null; // JsonValue in Prisma

  price: any | null;
  pricePerMeter: any | null;
  currency: string | null;
  status: any;

  images: string[];
  documents: string[];
  features: string | null;
  notes: string | null;

  // Owner Information
  ownerName: string | null;
  ownerPhone: string | null;

  // Property Group
  groupId: number | null;

  // City Center
  cityCenterId: number | null;

  // Sports City
  sportsCityId: number | null;

  // Filters
  propertyGroupFilter: any | null; // PropertyGroupFilter enum
  cityCenterFilter: any | null; // CityCenterFilter enum

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
