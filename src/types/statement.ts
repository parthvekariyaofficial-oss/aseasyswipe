export type StatementType = 'CREDIT' | 'DEBIT';

export type StatementCategory = 
  | 'QR_LOAD' 
  | 'PAYOUT' 
  | 'CC_BILL' 
  | 'BBPS_BILL' 
  | 'REFUND' 
  | 'MANUAL_ADJUST';

export interface StatementEntry {
  id: string;
  original_id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  user_mobile?: string;
  type: StatementType;
  category: StatementCategory;
  amount: number;
  charge_amount: number;
  net_amount: number;
  opening_balance: number;
  closing_balance: number;
  running_balance: number;
  title: string;
  narration: string;
  math_breakdown: string;
  reference_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED' | 'REJECTED';
  created_at: string;
}

export interface StatementSummary {
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  total_commission: number;
  closing_balance: number;
  current_wallet_balance?: number;
  total_entries_count: number;
}

export interface AccountDetails {
  user_id?: string;
  name: string;
  firm_name?: string;
  mobile_number?: string;
  role?: string;
  status?: string;
}

export interface AccountStatement {
  account_details: AccountDetails;
  summary: StatementSummary;
  entries: StatementEntry[];
}

export interface StatementFilterParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  search?: string;
  targetUserId?: string;
}
