import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @IsEnum([
    'project',
    'task',
    'comment',
    'workspace',
    'property',
    'lead',
    'contract',
  ])
  entityType?:
    | 'project'
    | 'task'
    | 'comment'
    | 'workspace'
    | 'property'
    | 'lead'
    | 'contract';

  @IsOptional()
  @IsString()
  entityId?: string;
}
