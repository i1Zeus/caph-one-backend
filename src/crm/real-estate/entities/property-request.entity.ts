import {
  PropertyRequest as PrismaPropertyRequest,
  PropertyRequestType,
  PropertyType,
  RequestStatus,
  EntityType,
} from '@prisma/client';

export class PropertyRequest implements PrismaPropertyRequest {
  id: number;
  leadId: string;
  title: string;
  description: string | null;
  propertyType: PropertyType | null;
  requestType: PropertyRequestType;
  city: string | null;
  district: string | null;
  address: string | null;
  priceMin: any; // Decimal
  priceMax: any; // Decimal
  lengthMin: any; // Decimal
  lengthMax: any; // Decimal
  widthMin: any; // Decimal
  widthMax: any; // Decimal
  heightMin: any; // Decimal
  heightMax: any; // Decimal
  builtUpAreaMin: any; // Decimal
  builtUpAreaMax: any; // Decimal
  gardenAreaMin: any; // Decimal
  gardenAreaMax: any; // Decimal
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  bathroomsMin: number | null;
  bathroomsMax: number | null;
  floorsMin: number | null;
  floorsMax: number | null;
  parkingSpacesMin: number | null;
  parkingSpacesMax: number | null;
  elevatorsMin: number | null;
  elevatorsMax: number | null;
  balconiesMin: number | null;
  balconiesMax: number | null;
  yearBuiltMin: number | null;
  yearBuiltMax: number | null;
  finishingType: string | null;
  view: string | null;
  direction: string | null;
  hasSwimmingPool: boolean | null;
  hasGym: boolean | null;
  hasMaidRoom: boolean | null;
  hasStorage: boolean | null;
  status: RequestStatus;
  notes: string | null;

  entityType: EntityType | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
