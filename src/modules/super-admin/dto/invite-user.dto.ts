import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRoleType } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRoleType)
  @IsNotEmpty()
  role: UserRoleType;
}
