import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApplyBusinessTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId: string; // معرف القالب

  @IsOptional()
  @IsString()
  customPrefix?: string; // بادئة مخصصة للحسابات (اختياري)
}

export class BusinessTemplateResponseDto {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  accountsCount: number;
  hasInvoiceConfigs: boolean;
}

export class ApplyTemplateResultDto {
  success: boolean;
  templateId: string;
  templateName: string;
  accountsCreated: number;
  configsCreated: number;
  errors: string[];
  accounts: Array<{
    id: number;
    code: string;
    name: string;
    type: string;
  }>;
}
