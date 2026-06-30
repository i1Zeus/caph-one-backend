import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { DeviceAttendanceRecordDto } from './device-attendance-record.dto';

export class BulkDeviceAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceAttendanceRecordDto)
  records: DeviceAttendanceRecordDto[];
}
