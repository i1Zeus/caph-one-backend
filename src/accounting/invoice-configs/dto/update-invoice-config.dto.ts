import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceConfigDto } from './create-invoice-config.dto';

export class UpdateInvoiceConfigDto extends PartialType(
  CreateInvoiceConfigDto,
) {}
