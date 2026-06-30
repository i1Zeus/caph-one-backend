export interface IncomeStatementAccountLine {
  accountId: number;
  accountName: string;
  accountCode?: string;
  amount: number;
  percentage: number;
}

export interface IncomeStatementSection {
  sectionName: string;
  accounts: IncomeStatementAccountLine[];
  total: number;
  percentage: number;
}

export interface IncomeStatementSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netIncome: number;
  profitMargin: number;
}

export interface IncomeStatementResponse {
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  summary: IncomeStatementSummary;
  filters: {
    startDate?: Date;
    endDate?: Date;
  };
}
