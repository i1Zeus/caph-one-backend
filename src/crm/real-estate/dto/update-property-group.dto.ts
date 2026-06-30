import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyGroupDto } from './create-property-group.dto';

export class UpdatePropertyGroupDto extends PartialType(
  CreatePropertyGroupDto,
) {}
