import { AttachmentFileType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateContractAttachmentDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  contractId: number;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsEnum(AttachmentFileType)
  @IsOptional()
  fileType?: AttachmentFileType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
