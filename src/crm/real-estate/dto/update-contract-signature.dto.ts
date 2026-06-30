import { PartialType } from '@nestjs/mapped-types';
import { CreateContractSignatureDto } from './create-contract-signature.dto';

export class UpdateContractSignatureDto extends PartialType(
  CreateContractSignatureDto,
) {}
