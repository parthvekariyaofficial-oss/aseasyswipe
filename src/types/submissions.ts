export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  mobile_number?: string;
  amount: number;
  utr_number: string;
  qr_id?: number;
  bank_name?: string;
  screenshot_url: string;
  status: SubmissionStatus;
  actioned_by?: string | null;
  actioned_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface WalletTransactionLedger {
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  reference_id: string;
  opening_balance: number;
  closing_balance: number;
  description: string;
  created_at: string;
}
