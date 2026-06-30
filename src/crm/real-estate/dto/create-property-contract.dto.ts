import { ContractStatus, ContractType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreatePropertyContractDto {
  @IsString()
  @IsOptional()
  contractNumber?: string; // يمكن توليده تلقائياً إذا لم يُقدم

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  propertyId: number;

  @IsUUID()
  @IsNotEmpty()
  leadId: string; // معرف العميل المحتمل (Lead UUID)

  @IsInt()
  @IsOptional()
  @Min(1)
  requestId?: number; // معرف الطلب الأصلي (إن وُجد)

  @IsEnum(ContractType)
  @IsNotEmpty()
  contractType: ContractType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Type(() => Number)
  contractAmount: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];

  @IsString()
  @IsOptional()
  firstPartyName?: string;

  @IsString()
  @IsOptional()
  firstPartyAddress?: string;

  @IsString()
  @IsOptional()
  firstPartyIdNumber?: string;

  @IsString()
  @IsOptional()
  firstPartyPhone?: string;

  @IsString()
  @IsOptional()
  secondPartyName?: string;

  @IsString()
  @IsOptional()
  secondPartyAddress?: string;

  @IsString()
  @IsOptional()
  secondPartyIdNumber?: string;

  @IsString()
  @IsOptional()
  secondPartyPhone?: string;

  @IsString()
  @IsOptional()
  propertyTypeDetails?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  propertyArea?: number;

  @IsString()
  @IsOptional()
  propertyDistrict?: string;

  @IsString()
  @IsOptional()
  propertySequence?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  downpayment?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  remainingAmount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  firstPartyPenalty?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  secondPartyPenalty?: number;

  @IsString()
  @IsOptional()
  dischargeFeesResponsibility?: string;

  @IsString()
  @IsOptional()
  allFeesResponsibility?: string;

  @IsString()
  @IsOptional()
  additionalClauses?: string;

  @IsString()
  @IsOptional()
  contractAmountInWriting?: string;

  @IsString()
  @IsOptional()
  rentDuration?: string;

  @IsString()
  @IsOptional()
  rentPaymentTerms?: string;

  @IsString()
  @IsOptional()
  rentRefusalTerms?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  securityDeposit?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  rentBreachPenalty?: number;

  @IsString()
  @IsOptional()
  rentFeesResponsibility?: string;

  @IsBoolean()
  @IsOptional()
  chamberOfCommerceStamp?: boolean;

  @IsDateString()
  @IsOptional()
  agreementDate?: string;
}
