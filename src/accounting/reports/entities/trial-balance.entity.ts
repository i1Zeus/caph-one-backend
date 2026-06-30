import { AccountType } from '@prisma/client';

export interface TrialBalanceEntry {
  accountId: number;
  accountName: string;
  accountCode?: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
  currencyCode?: string;
}

export interface TrialBalanceSummary {
  totalDebitBalances: number;
  totalCreditBalances: number;
  isBalanced: boolean;
  balanceDifference: number;
  accountsByType: {
    [key in AccountType]: {
      count: number;
      totalDebits: number;
      totalCredits: number;
    };
  };
}

export interface TrialBalanceResponse {
  data: TrialBalanceEntry[];
  summary: TrialBalanceSummary;
  filters: {
    startDate?: Date;
    endDate?: Date;
    accountType?: AccountType;
    showZeroBalances: boolean;
    showOnlyCashAccounts: boolean;
  };
  generatedAt: Date;
}
