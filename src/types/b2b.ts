export interface UsePayBalanceData {
  balance: number;
  bbps_wallet_balance: number;
  payout_wallet_balance: number;
  cspl_wallet_balance: number;
  usable_bbps_balance: number;
  fixed_deposit_amount?: number;
  is_bbps_enabled: boolean;
  is_payout_enabled: boolean;
  is_cspl_enabled: boolean;
}

export interface UsePayBalanceResponse {
  success: boolean;
  configured?: boolean;
  is_mock?: boolean;
  message?: string;
  data?: UsePayBalanceData;
  error_code?: string;
}

// B2B BBPS Live Bill Payment Types
export interface BillerCategory {
  category_id: number;
  category_name: string;
}

export interface BillerInputParam {
  paramName: string;
  dataType: 'NUMERIC' | 'ALPHANUMERIC' | 'TEXT';
  isOptional: 'true' | 'false' | boolean;
  minLength?: number;
  maxLength?: number;
}

export interface Biller {
  biller_id: string;
  biller_name: string;
  category: string;
  category_id?: number;
  payment_modes: string[];
  is_active?: boolean;
  updated_at?: string;
  metadata?: {
    billerInputParams?: {
      paramInfo?: BillerInputParam[];
    };
  };
}

export interface CustomerParamItem {
  name: string;
  value: string;
}

export interface BillerResponseInfo {
  customerName?: string;
  amount?: string;
  billAmount?: string;
  dueDate?: string;
  billDate?: string;
  billNumber?: string;
  billPeriod?: string;
}

export interface AdditionalInfoItem {
  infoName: string;
  infoValue: string;
}

export interface FetchBillResponse {
  status: 'success' | 'error' | string;
  message?: string;
  data?: {
    responseCode?: string;
    responseReason?: string;
    fetchRequestId?: string;
    requestId?: string;
    billerResponseInfo?: BillerResponseInfo;
    billerResponse?: BillerResponseInfo;
    additionalInfo?: AdditionalInfoItem[];
  };
}

export interface PayBillPayload {
  billerId: string;
  amount: number;
  mobile: string;
  paymentMode?: string;
  client_transaction_id?: string;
  fetchRequestId?: string;
  customerParams: CustomerParamItem[];
  billerResponseInfo?: BillerResponseInfo;
  additionalInfo?: AdditionalInfoItem[];
  customerPan?: string;
}

export interface PayBillResponse {
  status: 'success' | 'pending' | 'failed' | 'error' | string;
  payment_status?: string;
  message?: string;
  transaction_id?: string;
  client_transaction_id?: string;
  bbps_txn_ref_id?: string;
  charge_deducted?: number;
  refunded?: boolean;
  refunded_amount?: number;
  data?: {
    transaction_id?: string;
    api_txn_id?: string;
    client_transaction_id?: string;
    status?: string;
    payment_status?: string;
  };
}

// ============================================================================
// API WALLET FUND REQUEST TYPES
// ============================================================================

export type ApiWalletType = 'cspl' | 'bbps' | 'payout';

export interface UsePayActiveServiceItem {
  wallet_type: ApiWalletType;
  label: string;
  service_title: string;
  badge_color: string;
  current_balance: number;
  endpoint: string;
}

export interface UsePayAdminBankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  upi_id?: string;
  branch?: string;
  qr_code_url?: string;
}

export interface ApiFundRequestPayload {
  amount: number;
  utr_number: string;
  wallet_type: ApiWalletType;
  admin_bank_account_id?: string;
  proof_url?: string;
}

export interface ApiFundRequestRecord {
  id: string;
  request_id: string;
  amount: number;
  utr_number: string;
  wallet_type: ApiWalletType;
  admin_bank_account_id?: string | null;
  proof_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at: string;
  updated_at?: string;
}

export interface FundRequestHistoryResponse {
  success: boolean;
  status: string;
  requests: ApiFundRequestRecord[];
}

export interface FundRequestStatusResponse {
  success: boolean;
  status: string;
  data: {
    request_id: string;
    status: 'pending' | 'approved' | 'rejected' | string;
    updated_at: string;
    upstream?: any;
  };
}
