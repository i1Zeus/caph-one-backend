import { PartialType } from '@nestjs/mapped-types';
import { CreateCityCenterDto } from './create-city-center.dto';

export class UpdateCityCenterDto extends PartialType(CreateCityCenterDto) {}
