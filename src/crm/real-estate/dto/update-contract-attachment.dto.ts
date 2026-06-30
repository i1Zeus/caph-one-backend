import { PartialType } from '@nestjs/mapped-types';
import { AttachmentFileType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateContractAttachmentDto } from './create-contract-attachment.dto';

export class UpdateContractAttachmentDto extends PartialType(
  CreateContractAttachmentDto,
) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AttachmentFileType)
  @IsOptional()
  fileType?: AttachmentFileType;
}
