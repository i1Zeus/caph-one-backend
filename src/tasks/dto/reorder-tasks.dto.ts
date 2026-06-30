import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class TaskOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  taskStageId: string;
}

export class ReorderTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskOrderItem)
  tasks: TaskOrderItem[];
}
