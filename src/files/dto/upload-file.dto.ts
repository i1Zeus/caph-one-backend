import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @IsEnum(['project', 'task', 'comment', 'workspace'])
  entityType?: 'project' | 'task' | 'comment' | 'workspace';

  @IsOptional()
  @IsString()
  entityId?: string;
}
