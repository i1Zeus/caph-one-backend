import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class ProjectOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  projectStageId: string;
}

export class ReorderProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectOrderItem)
  projects: ProjectOrderItem[];
}
