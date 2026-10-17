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
  valid?: boolean;
  min_limit?: number;
  max_limit?: number;
  message?: string;
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

export interface PayoutBeneficiary {
  id: string;
  user_id: string;
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
  bank_name?: string;
  branch?: string;
  city?: string;
  is_verified?: boolean;
  verified_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PayoutVerification {
  id: string;
  user_id: string;
  user_name?: string;
  user_mobile?: string;
  account_number: string;
  ifsc_code: string;
  name_at_bank?: string;
  bank_name?: string;
  branch?: string;
  city?: string;
  utr?: string;
  reference_id?: string;
  client_reference_id?: string;
  account_status?: string;
  charge_deducted: number;
  gateway_charge?: number;
  status: 'success' | 'failed';
  failure_reason?: string;
  created_at: string;
}

export interface VerificationStats {
  total_verifications: number;
  success_count: number;
  failed_count: number;
  total_collected: number;
  total_gateway_cost: number;
  net_profit: number;
}
