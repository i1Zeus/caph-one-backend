import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadStageDto } from './create-lead-stage.dto';

export class UpdateLeadStageDto extends PartialType(CreateLeadStageDto) {}
