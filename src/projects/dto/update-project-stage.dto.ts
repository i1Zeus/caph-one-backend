import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectStageDto } from './create-project-stage.dto';

export class UpdateProjectStageDto extends PartialType(CreateProjectStageDto) {}
