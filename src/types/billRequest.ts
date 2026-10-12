export interface ChargeSlab {
  id: string;
  min_amount: number;
  max_amount: number;
  charge_amount: number;
  created_at?: string;
}

export interface CreditCardBillRequest {
  id: string;
  user_id: string;
  user_name?: string;
  user_mobile?: string;
  customer_name: string;
  card_number: string;
  bank_name: string;
  amount: number;
  service_charge: number;
  total_amount: number;
  mobile_number: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
}

export interface SubmitBillRequestInput {
  customer_name: string;
  card_number: string;
  bank_name: string;
  amount: number;
  mobile_number: string;
}
