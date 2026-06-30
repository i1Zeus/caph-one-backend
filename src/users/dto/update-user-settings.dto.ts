import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  img?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;
}
