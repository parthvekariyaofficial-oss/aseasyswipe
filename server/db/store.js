// In-Memory state for active rate-limiting and temporary OTP verifications.
// All domain data (Users, QR, Banks, Bills) is stored and queried directly from Supabase PostgreSQL Database.

export const db = {
  users: [],
  qr_masters: [],
  qr_payment_requests: [],
  payment_submissions: [],
  wallet_transactions: [],
  bill_payments: [],
  loginAttempts: {},
  otp_verifications: [],
  transactions: [],
  banks: [],
  bill_requests: [],
  charge_slabs: [],
  payout_slabs: [
    { id: 'poslab_01', min_amount: 100, max_amount: 1000, charge_type: 'flat', charge_value: 10, is_active: true, created_at: new Date().toISOString() },
    { id: 'poslab_02', min_amount: 1001, max_amount: 25000, charge_type: 'flat', charge_value: 15, is_active: true, created_at: new Date().toISOString() },
    { id: 'poslab_03', min_amount: 25001, max_amount: 200000, charge_type: 'flat', charge_value: 25, is_active: true, created_at: new Date().toISOString() }
  ],
  payout_transactions: [],
  wallet_ledger: [],
  system_settings: {
    user_qr_visible: true,
    qr_request_section_enabled: true,
    live_bill_pay_enabled: true
  }
};

db.qr_master = db.qr_masters;
