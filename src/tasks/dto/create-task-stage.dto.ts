import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTaskStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
