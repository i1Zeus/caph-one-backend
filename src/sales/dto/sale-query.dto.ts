export class SaleQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  saleType?: 'QUOTATION' | 'DIRECT';
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  clientId?: number;
}
