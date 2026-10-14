export type UserRole = 'admin' | 'super_distributor' | 'distributor' | 'user';
export type UserStatus = 'Active' | 'Inactive' | 'Blocked';
export type KycStatus = 'not_submitted' | 'under_review' | 'verified' | 'rejected' | 'pending';

export interface UserProfile {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  name: string;
  firm_name: string;
  email: string | null;
  mobile_number: string;
  must_change_password: boolean;
  role: UserRole;
  status: UserStatus;
  home_address?: string | null;
  firm_address?: string | null;
  profile_photo_url?: string | null;
  wallet_balance: number;
  hold_balance: number;
  commission_balance: number;
  t_plus_one_balance: number;
  tpin?: string;
  tpin_attempts?: number;
  tpin_locked_until?: string | null;
  mpin?: string;
  mpin_set?: boolean;
  charge_percentage?: number;
  qr_charge_percent?: number;
  service_charge_enabled?: boolean;
  custom_service_charge?: number;
  distributor_id?: string | null;
  super_distributor_id?: string | null;
  onesignal_id?: string | null;
  kyc_status?: KycStatus;
  kyc_rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycVerificationRecord {
  id: string;
  user_id: string;
  pan_card_url: string;
  aadhaar_front_url: string;
  aadhaar_back_url: string;
  firm_selfie_url: string;
  cheque_url: string;
  status: KycStatus;
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: Partial<UserProfile> | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'BILL_PAYMENT' | 'PAYOUT' | 'RECHARGE' | 'WALLET_TRANSFER' | 'COMMISSION_PAYOUT';
  amount: number;
  service_charge: number;
  net_amount: number;
  recipient_account: string;
  recipient_name?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REJECTED';
  reference_number: string;
  ip_address?: string;
  created_at: string;
}

export interface B2bCredentials {
  id: string;
  user_id: string;
  api_key: string;
  secret_key: string;
  webhook_url?: string;
  ip_whitelist?: string[];
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserProfile;
  must_change_password?: boolean;
  require_mpin_verify?: boolean;
  has_mpin_set?: boolean;
  user_name?: string;
  reason?: string;
  attemptsLeft?: number;
  lockedUntil?: string;
}
