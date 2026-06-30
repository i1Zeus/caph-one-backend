export const jwtConstants = {
  secret:
    'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
};

export const actionTypes = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ASSIGN: 'ASSIGN',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  RESET_PASSWORD: 'RESET_PASSWORD',
  VERIFY_EMAIL: 'VERIFY_EMAIL',
  VERIFY_PHONE: 'VERIFY_PHONE',
  VERIFY_OTP: 'VERIFY_OTP',
  UNASSIGN: 'UNASSIGN',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE',
  MOVE: 'MOVE',
  COMMENT: 'COMMENT',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PRIORITY_CHANGE: 'PRIORITY_CHANGE',
  STAGE_CHANGE: 'STAGE_CHANGE',
};

// Account Types Constants
export const ACCOUNT_TYPES = {
  // Balance Sheet - Assets
  ASSET_RECEIVABLE: 'asset_receivable',
  ASSET_CASH: 'asset_cash',
  ASSET_CURRENT: 'asset_current',
  ASSET_NON_CURRENT: 'asset_non_current',
  ASSET_PREPAYMENTS: 'asset_prepayments',
  ASSET_FIXED: 'asset_fixed',

  // Balance Sheet - Liabilities
  LIABILITY_PAYABLE: 'liability_payable',
  LIABILITY_CREDIT_CARD: 'liability_credit_card',
  LIABILITY_CURRENT: 'liability_current',
  LIABILITY_NON_CURRENT: 'liability_non_current',

  // Balance Sheet - Equity
  EQUITY: 'equity',
  EQUITY_UNAFFECTED: 'equity_unaffected',

  // Profit & Loss - Income
  INCOME: 'income',
  INCOME_OTHER: 'income_other',

  // Profit & Loss - Expense
  EXPENSE: 'expense',
  EXPENSE_OTHER: 'expense_other',
  EXPENSE_DEPRECIATION: 'expense_depreciation',
  EXPENSE_DIRECT_COST: 'expense_direct_cost',

  // Other
  OFF_BALANCE: 'off_balance',
} as const;

export const ACCOUNT_TYPE_GROUPS = [
  {
    label: 'Balance Sheet',
    options: [],
  },
  {
    label: 'Assets',
    options: [
      { value: ACCOUNT_TYPES.ASSET_RECEIVABLE, label: 'Receivable' },
      { value: ACCOUNT_TYPES.ASSET_CASH, label: 'Bank and Cash' },
      { value: ACCOUNT_TYPES.ASSET_CURRENT, label: 'Current Assets' },
      { value: ACCOUNT_TYPES.ASSET_NON_CURRENT, label: 'Non-current Assets' },
      { value: ACCOUNT_TYPES.ASSET_PREPAYMENTS, label: 'Prepayments' },
      { value: ACCOUNT_TYPES.ASSET_FIXED, label: 'Fixed Assets' },
    ],
  },
  {
    label: 'Liabilities',
    options: [
      { value: ACCOUNT_TYPES.LIABILITY_PAYABLE, label: 'Payable' },
      { value: ACCOUNT_TYPES.LIABILITY_CREDIT_CARD, label: 'Credit Card' },
      { value: ACCOUNT_TYPES.LIABILITY_CURRENT, label: 'Current Liabilities' },
      {
        value: ACCOUNT_TYPES.LIABILITY_NON_CURRENT,
        label: 'Non-current Liabilities',
      },
    ],
  },
  {
    label: 'Equity',
    options: [
      { value: ACCOUNT_TYPES.EQUITY, label: 'Equity' },
      {
        value: ACCOUNT_TYPES.EQUITY_UNAFFECTED,
        label: 'Current Year Earnings',
      },
    ],
  },
  {
    label: 'Profit & Loss',
    options: [],
  },
  {
    label: 'Income',
    options: [
      { value: ACCOUNT_TYPES.INCOME, label: 'Income' },
      { value: ACCOUNT_TYPES.INCOME_OTHER, label: 'Other Income' },
    ],
  },
  {
    label: 'Expense',
    options: [
      { value: ACCOUNT_TYPES.EXPENSE, label: 'Expenses' },
      { value: ACCOUNT_TYPES.EXPENSE_OTHER, label: 'Other Expenses' },
      { value: ACCOUNT_TYPES.EXPENSE_DEPRECIATION, label: 'Depreciation' },
      { value: ACCOUNT_TYPES.EXPENSE_DIRECT_COST, label: 'Cost of Revenue' },
    ],
  },
  {
    label: 'Other',
    options: [{ value: ACCOUNT_TYPES.OFF_BALANCE, label: 'Off-Balance Sheet' }],
  },
];

export type AccountTypeValue =
  (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];
