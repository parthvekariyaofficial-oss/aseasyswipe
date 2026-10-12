export type QrStatus = 'Active' | 'Inactive' | 'Disabled';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface QrMaster {
  id: string;
  name: string;
  mobile_number: string;
  upi_id: string;
  default_charge_percent: number;
  qr_image_url: string;
  is_active: boolean;
  is_selected?: boolean;
  bank_name?: string;
  account_holder_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QrPaymentRequest {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  qr_master_id?: string;
  qr_name?: string;
  upi_id?: string;
  amount: number;
  utr_number: string;
  mobile_number: string;
  screenshot_url?: string;
  status: PaymentRequestStatus;
  charge_percent: number;
  charge_amount: number;
  net_amount: number;
  distributor_commission?: number;
  super_distributor_commission?: number;
  admin_commission?: number;
  rejection_reason?: string;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
}

export interface QrSettings {
  id: number;
  is_qr_enabled: boolean;
  is_bbps_enabled: boolean;
  bbps_max_limit: number;
  qr_instruction_text: string;
  logo_url?: string;
}
