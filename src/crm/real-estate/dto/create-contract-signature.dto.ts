import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateContractSignatureDto {
  @IsInt()
  @IsNotEmpty()
  contractId: number;

  @IsString()
  @IsNotEmpty()
  signerName: string;

  @IsString()
  @IsNotEmpty()
  signerRole: string; // بائع، مشتري، مؤجر، مستأجر، شاهد، وكيل

  @IsString()
  @IsOptional()
  signerEmail?: string;

  @IsString()
  @IsOptional()
  signerPhone?: string;

  @IsString()
  @IsNotEmpty()
  signatureUrl: string; // URL أو Base64 للتوقيع الإلكتروني

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  orderIndex?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
