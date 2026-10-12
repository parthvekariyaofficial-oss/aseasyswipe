export type PayoutChargeType = 'flat' | 'percentage';

export interface PayoutSlab {
  id: string;
  min_amount: number;
  max_amount: number;
  charge_type: PayoutChargeType;
  charge_value: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PayoutCalculation {
  amount: number;
  charge_amount: number;
  total_deducted: number;
  slab: PayoutSlab | null;
}

export interface PayoutTransferPayload {
  amount: number;
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
  bank_name?: string;
  mobile_number?: string;
  transfer_mode?: 'IMPS' | 'NEFT';
  tpin?: string;
}

export interface PayoutTransaction {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  user_mobile?: string;
  client_order_id: string;
  api_order_id?: string;
  utr?: string;
  amount: number;
  slab_charge: number;
  total_deducted: number;
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
  bank_name?: string;
  mobile_number?: string;
  transfer_mode: 'IMPS' | 'NEFT';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  refunded_to_wallet?: boolean;
  failure_reason?: string;
  created_at: string;
  updated_at?: string;
}
