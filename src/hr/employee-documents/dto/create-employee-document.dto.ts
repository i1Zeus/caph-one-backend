import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum DocumentType {
  CONTRACT = 'CONTRACT',
  ID_COPY = 'ID_COPY',
  PASSPORT = 'PASSPORT',
  CERTIFICATE = 'CERTIFICATE',
  RESUME = 'RESUME',
  MEDICAL_REPORT = 'MEDICAL_REPORT',
  INSURANCE = 'INSURANCE',
  WORK_PERMIT = 'WORK_PERMIT',
  VISA = 'VISA',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  BANK_DETAILS = 'BANK_DETAILS',
  TAX_DOCUMENTS = 'TAX_DOCUMENTS',
  POLICE_CLEARANCE = 'POLICE_CLEARANCE',
  REFERENCE_LETTER = 'REFERENCE_LETTER',
  PERFORMANCE_REVIEW = 'PERFORMANCE_REVIEW',
  WARNING_LETTER = 'WARNING_LETTER',
  APPRECIATION = 'APPRECIATION',
  OTHER = 'OTHER',
}

export class CreateEmployeeDocumentDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  // File data will be handled by multer
  // These fields will be populated from the uploaded file
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimetype?: string;
}
