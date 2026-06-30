import { ClientType, TransactionType } from '@prisma/client';

export interface ClientStatementEntry {
  id: number;
  date: Date;
  transactionId: number;
  transactionType: TransactionType;
  description: string;
  invoiceNumber?: string;
  debit: number;
  credit: number;
  balance: number;
  runningBalance: number;
  accountId?: number;
  accountName?: string;
  currencyCode?: string;
}

export interface ClientStatementSummary {
  clientId: number;
  clientName: string;
  clientType: ClientType;
  phone?: string | null;
  address?: string | null;
  currencyCode?: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  transactionCount: number;
  lastTransactionDate?: Date;
  period: {
    startDate?: Date;
    endDate?: Date;
  };
}

export interface ClientStatementResponse {
  data: ClientStatementEntry[];
  summary: ClientStatementSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    clientId: number;
    startDate?: Date;
    endDate?: Date;
    clientType?: ClientType;
  };
  generatedAt: Date;
}
