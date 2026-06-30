import { ClientType } from '@prisma/client';

export interface UnpaidClientEntry {
  clientId: number;
  clientName: string;
  clientType: ClientType;
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  oldestInvoiceDate?: Date;
  latestInvoiceDate?: Date;
}

export interface UnpaidClientsSummary {
  totalClients: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalOutstandingAmount: number;
  customerOutstanding: number;
  supplierOutstanding: number;
}

export interface UnpaidClientsResponse {
  data: UnpaidClientEntry[];
  summary: UnpaidClientsSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    clientType?: string;
  };
}
