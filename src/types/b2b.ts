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
