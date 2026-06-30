export interface ReceiptReportEntry {
  id: number;
  date: Date;
  receiptNumber: string;
  clientId?: number;
  clientName?: string;
  accountId: number;
  accountName: string;
  amount: number;
  description: string | null;
  currencyCode?: string;
}

export interface ReceiptsReportSummary {
  totalReceipts: number;
  totalAmount: number;
  receiptsByAccount: Record<
    string,
    {
      accountName: string;
      count: number;
      totalAmount: number;
    }
  >;
}

export interface ReceiptsReportResponse {
  data: ReceiptReportEntry[];
  summary: ReceiptsReportSummary;
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
