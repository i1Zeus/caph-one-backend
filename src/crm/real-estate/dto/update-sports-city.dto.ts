import { PartialType } from '@nestjs/mapped-types';
import { CreateSportsCityDto } from './create-sports-city.dto';

export class UpdateSportsCityDto extends PartialType(CreateSportsCityDto) {}
