import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyRequestDto } from './create-property-request.dto';

export class UpdatePropertyRequestDto extends PartialType(
  CreatePropertyRequestDto,
) {}
