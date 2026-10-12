export type BillStatus = 'pending' | 'processing' | 'approved' | 'rejected';
export type ServiceType = 'Electricity' | 'Credit Card' | 'Gas' | 'Water' | 'Broadband';

export interface BillSubmission {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  mobile_number?: string;
  service_type: ServiceType | string;
  provider: string;
  consumer_number: string;
  customer_name?: string;
  customer_mobile?: string;
  amount: number;
  charges: number;
  total_debited: number;
  bill_proof_url?: string;
  receipt_proof_url?: string;
  status: BillStatus;
  claimed_by?: string | null;
  operator_ref?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  actioned_at?: string | null;
}
