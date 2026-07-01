import { SubscriptionTier } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  subdomain?: string;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier = SubscriptionTier.FREE;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number = 10;
}
