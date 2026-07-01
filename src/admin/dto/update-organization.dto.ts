import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxWorkspaces?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
