import { SubscriptionTier } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subdomain?: string;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
