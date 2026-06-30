import { IsInt, IsOptional } from 'class-validator';

export class UpdateDefaultAccountsDto {
  @IsOptional()
  @IsInt()
  defaultCustomerAccountId?: number | null;

  @IsOptional()
  @IsInt()
  defaultSupplierAccountId?: number | null;
}
