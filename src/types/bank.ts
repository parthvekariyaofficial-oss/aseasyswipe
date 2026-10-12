export interface BankAccount {
  id: string;
  bank_name: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateBankInput {
  bank_name: string;
  is_active: boolean;
}
