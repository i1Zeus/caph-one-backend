import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetFilesByEntityDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum([
    'project',
    'task',
    'comment',
    'workspace',
    'contract',
    'property',
    'lead',
  ])
  entityType:
    | 'project'
    | 'task'
    | 'comment'
    | 'workspace'
    | 'contract'
    | 'property'
    | 'lead';

  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class GetFileStatsDto {
  @IsOptional()
  @IsString()
  @IsEnum([
    'project',
    'task',
    'comment',
    'workspace',
    'contract',
    'property',
    'lead',
  ])
  entityType?:
    | 'project'
    | 'task'
    | 'comment'
    | 'workspace'
    | 'contract'
    | 'property'
    | 'lead';

  @IsOptional()
  @IsString()
  entityId?: string;
}

export class GeneratePresignedUrlDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  expiresIn?: number = 3600;
}

export class GetAllFilesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum([
    'project',
    'task',
    'comment',
    'workspace',
    'contract',
    'property',
    'lead',
  ])
  entityType?:
    | 'project'
    | 'task'
    | 'comment'
    | 'workspace'
    | 'contract'
    | 'property'
    | 'lead';

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  mimetype?: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsEnum(['name', 'size', 'createdAt', 'mimetype'])
  sortBy?: 'name' | 'size' | 'createdAt' | 'mimetype' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
