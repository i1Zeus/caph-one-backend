import {
  PropertyRequestType,
  PropertyType,
  RequestStatus,
  EntityType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePropertyRequestDto {
  @IsUUID()
  @IsNotEmpty()
  leadId: string; // معرف العميل المحتمل (Lead UUID)

  @IsString()
  @IsNotEmpty()
  title: string; // عنوان الطلب

  @IsString()
  @IsOptional()
  description?: string; // وصف الطلب

  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType; // نوع العقار المطلوب

  @IsEnum(PropertyRequestType)
  @IsNotEmpty()
  requestType: PropertyRequestType; // نوع الطلب (شراء/استئجار)

  // Location - الموقع المفضل
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Price Range - نطاق السعر
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  priceMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  priceMax?: number;

  // Dimensions Range - نطاق الأبعاد
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  lengthMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  lengthMax?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  widthMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  widthMax?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  heightMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  heightMax?: number;

  // Area Range - نطاق المساحات
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  builtUpAreaMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  builtUpAreaMax?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  gardenAreaMin?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  gardenAreaMax?: number;

  // Details Range - نطاق التفاصيل
  @IsInt()
  @IsOptional()
  @Min(0)
  bedroomsMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  bedroomsMax?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  bathroomsMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  bathroomsMax?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  floorsMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  floorsMax?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  parkingSpacesMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  parkingSpacesMax?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  elevatorsMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  elevatorsMax?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  balconiesMin?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  balconiesMax?: number;

  @IsInt()
  @IsOptional()
  @Min(1900)
  yearBuiltMin?: number;

  @IsInt()
  @IsOptional()
  @Min(1900)
  yearBuiltMax?: number;

  // Additional Preferences - تفضيلات إضافية
  @IsString()
  @IsOptional()
  finishingType?: string;

  @IsString()
  @IsOptional()
  view?: string;

  @IsString()
  @IsOptional()
  direction?: string;

  // Features - المميزات المطلوبة
  @IsBoolean()
  @IsOptional()
  hasSwimmingPool?: boolean;

  @IsBoolean()
  @IsOptional()
  hasGym?: boolean;

  @IsBoolean()
  @IsOptional()
  hasMaidRoom?: boolean;

  @IsBoolean()
  @IsOptional()
  hasStorage?: boolean;

  // Status
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  // Additional Info
  @IsString()
  @IsOptional()
  notes?: string;


  @IsEnum(EntityType)
  @IsOptional()
  entityType?: EntityType;
}
