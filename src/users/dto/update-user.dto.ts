import { PartnerType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)]{7,20}$/, {
    message:
      'Please provide a valid phone number (7-20 digits, may include +, spaces, hyphens, and parentheses)',
  })
  phone?: string;

  @IsString({ message: 'Password must be a string' })
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password?: string;

  @IsString({ message: 'Image must be a string' })
  @IsOptional()
  img?: string;

  @IsOptional()
  roleIds?: string[]; // Array of role IDs for multiple role assignment

  @IsEnum(PartnerType, { message: 'Please select a valid partner type' })
  @IsOptional()
  type?: PartnerType;
}
