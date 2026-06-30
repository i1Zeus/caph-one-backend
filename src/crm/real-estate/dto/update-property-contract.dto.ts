import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyContractDto } from './create-property-contract.dto';

export class UpdatePropertyContractDto extends PartialType(
  CreatePropertyContractDto,
) {}
