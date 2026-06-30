import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DeviceAttendanceRecordDto {
  @IsNumber()
  sn: number;

  @IsString()
  user_id: string; // fingerprint ID

  @IsString()
  record_time: string;

  @IsNumber()
  type: number;

  @IsNumber()
  state: number;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  formatted_time?: string;
}
