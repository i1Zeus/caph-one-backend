import {
  CityCenterFilter,
  PropertyGroupFilter,
  PropertyStatus,
  PropertyType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  propertyType: PropertyType;

  // Location
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  coordinates?: string;

  // Dimensions
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  height?: number;

  // Area
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  area?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  builtUpArea?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  gardenArea?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  buildingToLandRatio?: number;

  @IsString()
  @IsOptional()
  areaUnit?: string;

  // Details
  @IsInt()
  @IsOptional()
  @Min(0)
  bedrooms?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  bathrooms?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  floors?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  parkingSpaces?: number;

  @IsInt()
  @IsOptional()
  @Min(1900)
  yearBuilt?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  buildingAge?: number;

  // Construction
  @IsString()
  @IsOptional()
  finishingType?: string;

  @IsString()
  @IsOptional()
  structureType?: string;

  @IsString()
  @IsOptional()
  flooringType?: string;

  @IsString()
  @IsOptional()
  windowType?: string;

  @IsString()
  @IsOptional()
  doorType?: string;

  // Utilities
  @IsString()
  @IsOptional()
  acSystem?: string;

  @IsString()
  @IsOptional()
  heatingSystem?: string;

  @IsOptional()
  thermalInsulation?: boolean;

  @IsOptional()
  soundInsulation?: boolean;

  @IsOptional()
  waterproofing?: boolean;

  @IsString()
  @IsOptional()
  waterSource?: string;

  @IsString()
  @IsOptional()
  electricityType?: string;

  @IsString()
  @IsOptional()
  internetType?: string;

  @IsString()
  @IsOptional()
  securitySystem?: string;

  // Additional Features
  @IsInt()
  @IsOptional()
  @Min(0)
  elevators?: number;

  @IsOptional()
  hasSwimmingPool?: boolean;

  @IsOptional()
  hasGym?: boolean;

  @IsOptional()
  hasMaidRoom?: boolean;

  @IsOptional()
  hasStorage?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  balconies?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  balconyArea?: number;

  @IsString()
  @IsOptional()
  view?: string;

  @IsString()
  @IsOptional()
  direction?: string;

  // Legal Information
  @IsString()
  @IsOptional()
  deedNumber?: string;

  @IsString()
  @IsOptional()
  planNumber?: string;

  @IsString()
  @IsOptional()
  plotNumber?: string;

  @IsString()
  @IsOptional()
  nearbyServices?: string;

  // Financial
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  pricePerMeter?: number;

  @IsString()
  @IsOptional()
  currency?: string;


  // Status
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  // Media & Documents
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];

  // Additional Info
  @IsString()
  @IsOptional()
  features?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Owner Information
  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  ownerPhone?: string;

  // Property Group
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  groupId?: number;

  // City Center
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cityCenterId?: number;

  // Sports City
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sportsCityId?: number;

  // Filters - التصفية
  @IsEnum(PropertyGroupFilter)
  @IsOptional()
  propertyGroupFilter?: PropertyGroupFilter;

  @IsEnum(CityCenterFilter)
  @IsOptional()
  cityCenterFilter?: CityCenterFilter;
}
