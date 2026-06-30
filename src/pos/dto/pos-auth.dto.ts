import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PosAuthDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  pin: string;
}

export class LockPosDto {
  @IsString()
  employeeId: string;
}

export class UnlockPosDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  pin: string;
}
