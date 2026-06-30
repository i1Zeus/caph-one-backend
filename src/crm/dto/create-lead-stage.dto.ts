import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLeadStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;
}
