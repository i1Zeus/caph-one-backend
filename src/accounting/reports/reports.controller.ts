import { Controller, Get, Logger, Query, ValidationPipe } from '@nestjs/common';
import {
  AccountStatementFilterDto,
  ClientStatementFilterDto,
  GeneralLedgerFilterDto,
  IncomeStatementFilterDto,
  JournalEntryFilterDto,
  PaymentsReportFilterDto,
  ReceiptsReportFilterDto,
  TrialBalanceFilterDto,
  UnpaidClientsFilterDto,
} from './dto';
import { ReportsService } from './reports.service';

@Controller('accounting/reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get General Ledger Report - تقرير سجل الاستاذ العام
   *
   * @description This endpoint generates a comprehensive general ledger report
   * showing all account transactions with running balances. It supports various
   * filters to customize the report based on specific requirements.
   *
   * @param filters Query parameters for filtering the report
   * @returns Paginated general ledger entries with summary and metadata
   *
   * @example
   * GET /accounting/reports/general-ledger?accountId=1&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
   */
  @Get('general-ledger')
  async getGeneralLedger(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GeneralLedgerFilterDto,
  ) {
    this.logger.log('General Ledger report requested with filters:', filters);
    return this.reportsService.getGeneralLedger(filters);
  }

  /**
   * Get Trial Balance Report - تقرير ميزان المراجعة
   *
   * @description This endpoint generates a trial balance report showing
   * all accounts with their debit and credit balances. This report is
   * essential for verifying that the accounting equation is balanced.
   *
   * @param filters Query parameters for filtering the report
   * @returns Trial balance entries with summary and metadata
   *
   * @example
   * GET /accounting/reports/trial-balance?startDate=2024-01-01&endDate=2024-12-31&showZeroBalances=false
   */
  @Get('trial-balance')
  async getTrialBalance(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: TrialBalanceFilterDto,
  ) {
    this.logger.log('Trial Balance report requested with filters:', filters);
    return this.reportsService.getTrialBalance(filters);
  }

  /**
   * Get Account Statement Report - كشف حساب
   *
   * @description This endpoint generates a detailed account statement
   * showing all transactions for a specific account with running balances.
   * It's useful for analyzing the activity of individual accounts.
   *
   * @param filters Query parameters including accountId and date range
   * @returns Paginated account statement entries with summary
   *
   * @example
   * GET /accounting/reports/account-statement?accountId=1&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
   */
  @Get('account-statement')
  async getAccountStatement(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: AccountStatementFilterDto,
  ) {
    this.logger.log(
      'Account Statement report requested with filters:',
      filters,
    );
    return this.reportsService.getAccountStatement(filters);
  }

  /**
   * Get Client Statement Report - كشف حساب العميل/المورد
   *
   * @description This endpoint generates a detailed client statement
   * showing all transactions for a specific client (customer or supplier)
   * with running balances. Shows exactly what they owe us or we owe them.
   *
   * @param filters Query parameters including clientId and date range
   * @returns Paginated client statement entries with summary
   *
   * @example
   * GET /accounting/reports/client-statement?clientId=1&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
   */
  @Get('client-statement')
  async getClientStatement(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: ClientStatementFilterDto,
  ) {
    this.logger.log('Client Statement report requested with filters:', filters);
    return this.reportsService.getClientStatement(filters);
  }

  /**
   * Get Accounts Summary - ملخص الحسابات
   *
   * @description This endpoint provides a summary of all accounts
   * with their current balances and transaction counts. Useful for
   * quick overview and account selection in other reports.
   *
   * @returns List of all accounts with their balances and metadata
   *
   * @example
   * GET /accounting/reports/accounts-summary
   */
  @Get('accounts-summary')
  async getAccountsSummary() {
    this.logger.log('Accounts Summary requested');
    return this.reportsService.getAccountsSummary();
  }

  /**
   * Get Journal Entry Report - تقرير دفتر اليومية
   *
   * @description This endpoint generates a journal entry report showing
   * all transactions grouped with their transaction lines underneath.
   * Each transaction is displayed with all its debit and credit entries.
   *
   * @param filters Query parameters for filtering the report
   * @returns Paginated journal entries with summary and metadata
   *
   * @example
   * GET /accounting/reports/journal-entries?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
   */
  @Get('journal-entries')
  async getJournalEntries(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: JournalEntryFilterDto,
  ) {
    this.logger.log('Journal Entry report requested with filters:', filters);
    return this.reportsService.getJournalEntries(filters);
  }

  /**
   * Get Income Statement Report - تقرير الأرباح والخسائر
   *
   * @description This endpoint generates an income statement (profit & loss)
   * showing all revenues and expenses with net income calculation.
   * Essential for understanding business profitability over a period.
   *
   * @param filters Query parameters for filtering the report
   * @returns Income statement with revenue, expenses, and summary
   *
   * @example
   * GET /accounting/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('income-statement')
  async getIncomeStatement(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: IncomeStatementFilterDto,
  ) {
    this.logger.log('Income Statement report requested with filters:', filters);
    return this.reportsService.getIncomeStatement(filters);
  }

  /**
   * Get Receipts Report - تقرير المقبوضات
   */
  @Get('receipts')
  async getReceiptsReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: ReceiptsReportFilterDto,
  ) {
    this.logger.log('Receipts report requested with filters:', filters);
    return this.reportsService.getReceiptsReport(filters);
  }

  /**
   * Get Payments Report - تقرير المدفوعات
   */
  @Get('payments')
  async getPaymentsReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: PaymentsReportFilterDto,
  ) {
    this.logger.log('Payments report requested with filters:', filters);
    return this.reportsService.getPaymentsReport(filters);
  }

  /**
   * Get Unpaid Clients Report - تقرير العملاء غير المدفوع
   */
  @Get('unpaid-clients')
  async getUnpaidClientsReport(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: UnpaidClientsFilterDto,
  ) {
    this.logger.log('Unpaid Clients report requested with filters:', filters);
    return this.reportsService.getUnpaidClientsReport(filters);
  }
}
