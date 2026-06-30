import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskStageDto } from './create-task-stage.dto';

export class UpdateTaskStageDto extends PartialType(CreateTaskStageDto) {}
