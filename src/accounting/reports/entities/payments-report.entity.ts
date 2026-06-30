export interface PaymentReportEntry {
  id: number;
  date: Date;
  paymentNumber: string;
  clientId?: number;
  clientName?: string;
  accountId: number;
  accountName: string;
  amount: number;
  description: string | null;
  currencyCode?: string;
}

export interface PaymentsReportSummary {
  totalPayments: number;
  totalAmount: number;
  paymentsByAccount: Record<
    string,
    {
      accountName: string;
      count: number;
      totalAmount: number;
    }
  >;
}

export interface PaymentsReportResponse {
  data: PaymentReportEntry[];
  summary: PaymentsReportSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    startDate?: Date;
    endDate?: Date;
    clientId?: number;
    accountId?: number;
    search?: string;
  };
}
