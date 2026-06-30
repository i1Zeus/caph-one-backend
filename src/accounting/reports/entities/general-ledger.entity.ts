import { AccountType } from '@prisma/client';

export interface GeneralLedgerEntry {
  id: number;
  date: Date;
  transactionId: number;
  description: string;
  accountId: number;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  balance: number;
  runningBalance?: number;
  clientId?: number;
  clientName?: string;
  currencyCode?: string;
}

export interface GeneralLedgerSummary {
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  accountsSummary: AccountSummary[];
}

export interface AccountSummary {
  accountId: number;
  accountName: string;
  accountType: AccountType;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  transactionCount: number;
  currencyCode?: string;
}

export interface GeneralLedgerResponse {
  data: GeneralLedgerEntry[];
  summary: GeneralLedgerSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    startDate?: Date;
    endDate?: Date;
    accountId?: number;
    accountType?: AccountType;
    clientId?: number;
    search?: string;
  };
}
