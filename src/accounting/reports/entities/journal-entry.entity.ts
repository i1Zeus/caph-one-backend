import { AccountType } from '@prisma/client';

export interface JournalTransactionLine {
  id: number;
  accountId: number;
  accountName: string;
  accountType: AccountType;
  description?: string;
  debit: number;
  credit: number;
  clientId?: number;
  clientName?: string;
  currencyCode?: string;
}

export interface JournalEntry {
  id: number;
  date: Date;
  description: string;
  transactionType: string;
  clientId?: number;
  clientName?: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: JournalTransactionLine[];
  invoiceNumber?: string;
}

export interface JournalEntrySummary {
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  transactionsByType: {
    [key: string]: {
      count: number;
      totalDebits: number;
      totalCredits: number;
    };
  };
}

export interface JournalEntryResponse {
  data: JournalEntry[];
  summary: JournalEntrySummary;
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
