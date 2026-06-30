import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseTransactionDto } from './create-warehouse-transaction.dto';

export class UpdateWarehouseTransactionDto extends PartialType(
  CreateWarehouseTransactionDto,
) {}
