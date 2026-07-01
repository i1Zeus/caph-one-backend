import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRoleType } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(UserRoleType)
  @IsOptional()
  role?: UserRoleType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
