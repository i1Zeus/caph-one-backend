import { AccountType } from '@prisma/client';

export interface AccountStatementEntry {
  id: number;
  date: Date;
  transactionId: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  runningBalance: number;
  clientId?: number;
  clientName?: string;
}

export interface AccountStatementSummary {
  accountId: number;
  accountName: string;
  accountType: AccountType;
  currencyCode?: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  transactionCount: number;
  period: {
    startDate?: Date;
    endDate?: Date;
  };
}

export interface AccountStatementResponse {
  data: AccountStatementEntry[];
  summary: AccountStatementSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    accountId: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  };
  generatedAt: Date;
}
