import { InvoiceTemplateType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceTemplateDto {
  @IsEnum(InvoiceTemplateType)
  type: InvoiceTemplateType;

  @IsString()
  headerCompanyName: string;

  @IsString()
  @IsOptional()
  headerAddress?: string;

  @IsString()
  @IsOptional()
  headerLogoUrl?: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
