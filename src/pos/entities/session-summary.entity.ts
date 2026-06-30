export class PaymentBreakdown {
  cash: number;
  card: number;
  bankTransfer: number;
  credit: number;
  creditRemaining: number; // المبلغ المتبقي من الآجل
}

export class SessionSummary {
  sessionId: number;
  posId: number;
  posName: string;
  employeeId: string;
  employeeName: string;
  openedAt: Date;
  closedAt?: Date;
  status: string;

  // Balances
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  cashDifference?: number;

  // Totals
  totalSales: number;
  totalTransactions: number;

  // Payment method breakdown (calculated from queries)
  paymentBreakdown: PaymentBreakdown;

  // Notes
  openingNotes?: string;
  closingNotes?: string;
}
