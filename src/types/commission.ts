export interface CommissionSlab {
  id: number;
  service_type: string;
  min_amount: number;
  max_amount: number;
  retailer_charge: number;
  distributor_commission: number;
  super_distributor_commission: number;
  is_percentage: boolean;
  created_at: string;
}

export interface CommissionLedgerEntry {
  id: string;
  beneficiary_user_id: string;
  source_user_id: string;
  source_user_name?: string;
  service_type: string;
  transaction_ref: string;
  transaction_amount: number;
  commission_earned: number;
  created_at: string;
}

export interface MappedRetailerPerformance {
  id: string;
  name: string;
  firm_name: string;
  mobile_number: string;
  role: string;
  status: string;
  wallet_balance: number;
  kyc_status: string;
  total_turnover: number;
  total_tx_count: number;
  created_at: string;
}

export interface DistributorSummary {
  mapped_retailers_count: number;
  today_retailer_volume: number;
  total_commission_earned: number;
  withdrawable_balance: number;
  main_wallet_balance: number;
}
