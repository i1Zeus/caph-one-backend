import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from './create-employee-document.dto';

export class UpdateEmployeeDocumentDto {
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
