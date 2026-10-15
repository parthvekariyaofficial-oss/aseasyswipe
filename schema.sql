-- =============================================================================
-- ASEASY SWIPE FINTECH PORTAL - SAFE PRODUCTION POSTGRESQL SCHEMA (schema.sql)
-- Safe Migration Script (NO DROP TABLES, NO DUMMY DATA DELETION)
-- =============================================================================

-- 1. USERS PROFILES TABLE (Active Production Columns Only)
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id TEXT PRIMARY KEY, -- e.g., 'aseasyswipe_001', 'aseasyswipe_002'
    name TEXT NOT NULL,
    firm_name TEXT NOT NULL,
    email TEXT,
    mobile_number TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Bcrypt hashed password
    must_change_password BOOLEAN DEFAULT false,
    role TEXT CHECK (role IN ('super_distributor', 'distributor', 'user')) DEFAULT 'user',
    status TEXT CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    profile_photo_url TEXT,
    wallet_balance NUMERIC(15,2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
    commission_balance NUMERIC(15,2) DEFAULT 0.00,
    tpin VARCHAR(4) NOT NULL DEFAULT '1234',
    tpin_set BOOLEAN DEFAULT false,
    mpin VARCHAR(6) DEFAULT '123456',
    mpin_set BOOLEAN DEFAULT false,
    qr_charge_percent NUMERIC(5,2) DEFAULT 0.50, -- % Charge cut per QR payment
    distributor_id TEXT REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    super_distributor_id TEXT REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    kyc_status TEXT CHECK (kyc_status IN ('not_submitted', 'under_review', 'verified', 'rejected')) DEFAULT 'not_submitted',
    kyc_rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created in earlier versions
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT 'Password@123';
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS tpin VARCHAR(4) DEFAULT '1234';
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS tpin_set BOOLEAN DEFAULT false;
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS mpin VARCHAR(6) DEFAULT '123456';
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS mpin_set BOOLEAN DEFAULT false;
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT CHECK (kyc_status IN ('not_submitted', 'under_review', 'verified', 'rejected')) DEFAULT 'not_submitted';
ALTER TABLE public.users_profiles ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;


-- 1B. ADMIN PROFILES TABLE (Separate Dedicated Admin Accounts SQL Table - No TPIN)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id TEXT PRIMARY KEY, -- e.g., 'aseasyswipe_admin_001'
    name TEXT NOT NULL,
    firm_name TEXT NOT NULL DEFAULT 'Super Admin HQ',
    email TEXT UNIQUE,
    mobile_number TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Bcrypt hashed password
    must_change_password BOOLEAN DEFAULT false,
    role TEXT CHECK (role = 'admin') DEFAULT 'admin',
    status TEXT CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    profile_photo_url TEXT,
    mpin VARCHAR(6) DEFAULT '123456',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_mobile ON public.admin_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_admin_status ON public.admin_profiles(status);
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT 'Password@123';
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS mpin VARCHAR(6) DEFAULT '123456';
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE IF EXISTS public.admin_profiles DISABLE ROW LEVEL SECURITY;

-- 2. QR MASTERS TABLE (Admin Managed QR Codes & Setup)
CREATE TABLE IF NOT EXISTS public.qr_masters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    default_charge_percent NUMERIC(5,2) DEFAULT 0.50,
    qr_image_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true, -- On/Off Toggle status
    is_selected BOOLEAN DEFAULT false, -- Set Active QR for User Panel
    bank_name TEXT DEFAULT 'HDFC Bank',
    account_holder_name TEXT DEFAULT 'AsEasySwipe Digital',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QR PAYMENT REQUESTS TABLE (User Submissions & Processing)
CREATE TABLE IF NOT EXISTS public.qr_payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    qr_master_id TEXT REFERENCES public.qr_masters(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    utr_number VARCHAR(12) NOT NULL,
    mobile_number VARCHAR(10) NOT NULL,
    screenshot_url TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    charge_percent NUMERIC(5,2) DEFAULT 0.50,
    charge_amount NUMERIC(15,2) DEFAULT 0.00,
    net_amount NUMERIC(15,2) DEFAULT 0.00,
    distributor_commission NUMERIC(15,2) DEFAULT 0.00,
    super_distributor_commission NUMERIC(15,2) DEFAULT 0.00,
    rejection_reason TEXT,
    processed_at TIMESTAMPTZ,
    processed_by TEXT, -- Admin user ID from admin_profiles/users_profiles
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SYSTEM SETTINGS TABLE (System Controls & User Panel Toggles)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'qr_controls',
    user_qr_visible BOOLEAN DEFAULT true,
    qr_request_section_enabled BOOLEAN DEFAULT true,
    live_bill_pay_enabled BOOLEAN DEFAULT true,
    instant_payout_enabled BOOLEAN DEFAULT true,
    cc_bill_pay_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure column exists if table was already created in earlier versions
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS live_bill_pay_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS instant_payout_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS cc_bill_pay_enabled BOOLEAN DEFAULT true;

-- Insert default control settings row ONLY IF NOT EXISTS
INSERT INTO public.system_settings (id, user_qr_visible, qr_request_section_enabled, live_bill_pay_enabled, instant_payout_enabled, cc_bill_pay_enabled)
VALUES ('qr_controls', true, true, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- 5. BANK ACCOUNTS TABLE (Bank Entry Management)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE & UNIQNESS (SAFE CREATION)
CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users_profiles(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users_profiles(status);
CREATE INDEX IF NOT EXISTS idx_users_hierarchy ON public.users_profiles(distributor_id, super_distributor_id);
CREATE INDEX IF NOT EXISTS idx_qr_requests_user ON public.qr_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_requests_status ON public.qr_payment_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_requests_utr ON public.qr_payment_requests(utr_number);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active);

-- RLS POLICIES FOR BANK ACCOUNTS (Allows Select/Insert/Update/Delete)
ALTER TABLE IF EXISTS public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow all access to bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

-- 6. BILL CHARGE SLABS TABLE (Dynamic Service Charge Slabs)
CREATE TABLE IF NOT EXISTS public.bill_charge_slabs (
    id TEXT PRIMARY KEY,
    min_amount NUMERIC(15,2) NOT NULL,
    max_amount NUMERIC(15,2) NOT NULL,
    charge_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default charge slabs
INSERT INTO public.bill_charge_slabs (id, min_amount, max_amount, charge_amount)
VALUES 
  ('slab_01', 1.00, 50000.00, 25.00),
  ('slab_02', 50001.00, 100000.00, 50.00)
ON CONFLICT (id) DO NOTHING;

-- 7. CREDIT CARD BILL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.credit_card_bill_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    card_number VARCHAR(16) NOT NULL,
    bank_name TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    service_charge NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
    mobile_number VARCHAR(10) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT,
    processed_at TIMESTAMPTZ,
    processed_by TEXT, -- Admin user ID from admin_profiles/users_profiles
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_requests_user ON public.credit_card_bill_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_requests_status ON public.credit_card_bill_requests(status);

ALTER TABLE IF EXISTS public.bill_charge_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to bill_charge_slabs" ON public.bill_charge_slabs;
CREATE POLICY "Allow all access to bill_charge_slabs" ON public.bill_charge_slabs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.credit_card_bill_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to credit_card_bill_requests" ON public.credit_card_bill_requests;
CREATE POLICY "Allow all access to credit_card_bill_requests" ON public.credit_card_bill_requests FOR ALL USING (true) WITH CHECK (true);

-- 8. CREDIT CARD BILLERS DIRECTORY TABLE (BBPS Biller Directory Database Cache)
CREATE TABLE IF NOT EXISTS public.credit_card_billers (
    biller_id TEXT PRIMARY KEY,
    biller_name TEXT NOT NULL,
    category TEXT DEFAULT 'Credit Card',
    category_id INTEGER DEFAULT 7,
    payment_modes JSONB DEFAULT '["Cash", "UPI", "Internet Banking", "Debit Card"]',
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_card_billers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS public.credit_card_billers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to credit_card_billers" ON public.credit_card_billers;
CREATE POLICY "Allow all access to credit_card_billers" ON public.credit_card_billers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.credit_card_billers DISABLE ROW LEVEL SECURITY;

-- 9. BBPS LIVE BILL PAYMENTS TABLE (Real-time Gateway Transactions)
CREATE TABLE IF NOT EXISTS public.bbps_bill_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users_profiles(id) ON DELETE SET NULL,
    biller_id TEXT NOT NULL,
    biller_name TEXT NOT NULL,
    customer_name TEXT,
    customer_mobile TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',
    client_transaction_id TEXT UNIQUE NOT NULL,
    fetch_request_id TEXT,
    api_transaction_id TEXT,
    bbps_txn_ref_id TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'success', 'failed', 'rejected')) DEFAULT 'pending',
    status_message TEXT,
    customer_params JSONB,
    customer_pan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bbps_bill_payments ADD COLUMN IF NOT EXISTS customer_pan TEXT;

ALTER TABLE IF EXISTS public.bbps_bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to bbps_bill_payments" ON public.bbps_bill_payments;
CREATE POLICY "Allow all access to bbps_bill_payments" ON public.bbps_bill_payments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.bbps_bill_payments DISABLE ROW LEVEL SECURITY;


-- =============================================================================
-- ATOMIC RPC FUNCTION: PROCESS QR PAYMENT REQUEST (Strict Idempotency Guard)
-- Prevents double approval & double credit race conditions
-- =============================================================================
CREATE OR REPLACE FUNCTION public.process_qr_payment_request(
    p_request_id TEXT,
    p_action TEXT, -- 'approved' or 'rejected'
    p_admin_id TEXT,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_user RECORD;
    v_charge_pct NUMERIC(5,2);
    v_charge_amt NUMERIC(15,2);
    v_net_amt NUMERIC(15,2);
    v_ds_comm NUMERIC(15,2) := 0.00;
    v_ms_comm NUMERIC(15,2) := 0.00;
BEGIN
    -- 1. ATOMIC LOCK & IDEMPOTENCY CHECK
    -- Update status only if currently 'pending'
    UPDATE public.qr_payment_requests
    SET status = p_action,
        processed_at = NOW(),
        processed_by = p_admin_id,
        rejection_reason = CASE WHEN p_action = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = p_request_id AND status = 'pending'
    RETURNING * INTO v_req;

    -- If 0 rows updated, request was already processed or does not exist!
    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Request has already been processed or does not exist (Double approval prevented).'
        );
    END IF;

    -- If Action is 'rejected', return clean success response
    IF p_action = 'rejected' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Payment request rejected successfully.',
            'status', 'rejected'
        );
    END IF;

    -- 2. FETCH USER DETAILS & CALCULATE CHARGE & COMMISSIONS
    SELECT * INTO v_user FROM public.users_profiles WHERE id = v_req.user_id;
    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'User profile not found.';
    END IF;

    -- Deduct charge based ONLY on user's qr_charge_percent set in User Management
    v_charge_pct := COALESCE(v_user.qr_charge_percent, 0.00);
    v_charge_amt := ROUND((v_req.amount * (v_charge_pct / 100.0)), 2);
    v_net_amt := v_req.amount - v_charge_amt;

    -- Calculate hierarchy markup commission (0.15% to DS, 0.10% to MS)
    IF v_user.distributor_id IS NOT NULL THEN
        v_ds_comm := ROUND((v_req.amount * 0.0015), 2);
    END IF;
    IF v_user.super_distributor_id IS NOT NULL THEN
        v_ms_comm := ROUND((v_req.amount * 0.0010), 2);
    END IF;

    -- 3. UPDATE REQUEST AMOUNTS
    UPDATE public.qr_payment_requests
    SET charge_percent = v_charge_pct,
        charge_amount = v_charge_amt,
        net_amount = v_net_amt,
        distributor_commission = v_ds_comm,
        super_distributor_commission = v_ms_comm
    WHERE id = p_request_id;

    -- 4. ATOMIC CREDIT TO USER WALLET (Prevents double credit)
    UPDATE public.users_profiles
    SET wallet_balance = wallet_balance + v_net_amt,
        updated_at = NOW()
    WHERE id = v_user.id;

    -- 5. ATOMIC CREDIT TO DISTRIBUTOR COMMISSION
    IF v_user.distributor_id IS NOT NULL AND v_ds_comm > 0 THEN
        UPDATE public.users_profiles
        SET commission_balance = commission_balance + v_ds_comm,
            updated_at = NOW()
        WHERE id = v_user.distributor_id;
    END IF;

    -- 6. ATOMIC CREDIT TO SUPER DISTRIBUTOR COMMISSION
    IF v_user.super_distributor_id IS NOT NULL AND v_ms_comm > 0 THEN
        UPDATE public.users_profiles
        SET commission_balance = commission_balance + v_ms_comm,
            updated_at = NOW()
        WHERE id = v_user.super_distributor_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment approved! Wallet credited with net amount.',
        'net_amount', v_net_amt,
        'charge_amount', v_charge_amt,
        'status', 'approved'
    );
END;
$$;

-- DISABLE ROW LEVEL SECURITY (RLS) FOR FULL API & APP PERMISSIONS
ALTER TABLE public.users_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_masters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- DEFAULT ADMIN ACCOUNT SEED QUERIES
-- Mobile: 9999999999 | Password: Password@123 | MPIN: 123456 | TPIN: 1234
-- =============================================================================

-- Insert default admin in admin_profiles table ONLY (No TPIN)
INSERT INTO public.admin_profiles (
    id, name, firm_name, email, mobile_number, password, role, status, mpin
) VALUES (
    'aseasyswipe_admin_001',
    'Super Admin HQ',
    'AsEasySwipe Headquarter',
    'admin@aseasyswipe.com',
    '9999999999',
    '$2a$10$7R.x5xZ/d7Y9pZkH9sY8uO.X87qg0W8nK3Y8W/eX3p.3.pB3kP.x4Q',
    'admin',
    'Active',
    '123456'
)
ON CONFLICT (mobile_number) DO UPDATE 
SET role = 'admin', status = 'Active';

-- =============================================================================
-- 10. PAYOUT CHARGE SLABS TABLE (Admin Managed Dynamic Slabs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payout_charge_slabs (
    id TEXT PRIMARY KEY,
    min_amount NUMERIC(15,2) NOT NULL,
    max_amount NUMERIC(15,2) NOT NULL,
    charge_type VARCHAR(20) DEFAULT 'flat' CHECK (charge_type IN ('flat', 'percentage')),
    charge_value NUMERIC(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial default payout slabs
INSERT INTO public.payout_charge_slabs (id, min_amount, max_amount, charge_type, charge_value, is_active)
VALUES
  ('poslab_01', 100.00, 1000.00, 'flat', 10.00, true),
  ('poslab_02', 1001.00, 25000.00, 'flat', 15.00, true),
  ('poslab_03', 25001.00, 200000.00, 'flat', 25.00, true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 11. PAYOUT TRANSACTIONS TABLE (Instant Bank Transfers History)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payout_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    client_order_id TEXT UNIQUE NOT NULL,
    api_order_id TEXT,
    utr TEXT,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 100),
    slab_charge NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_deducted NUMERIC(15,2) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    beneficiary_name TEXT NOT NULL,
    bank_name TEXT,
    mobile_number VARCHAR(15),
    transfer_mode VARCHAR(10) DEFAULT 'IMPS',
    status TEXT CHECK (status IN ('pending', 'success', 'failed', 'refunded')) DEFAULT 'pending',
    refunded_to_wallet BOOLEAN DEFAULT false,
    failure_reason TEXT,
    api_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_user ON public.payout_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON public.payout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payout_client_order ON public.payout_transactions(client_order_id);

ALTER TABLE IF EXISTS public.payout_charge_slabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payout_transactions DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 12. WALLET LEDGER TABLE (Bank Passbook Account Statements)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    category VARCHAR(30) NOT NULL, -- 'QR_LOAD', 'PAYOUT', 'CC_BILL', 'BBPS_BILL', 'REFUND', 'MANUAL_ADJUST'
    amount NUMERIC(15,2) NOT NULL,
    charge_amount NUMERIC(15,2) DEFAULT 0.00,
    net_amount NUMERIC(15,2) NOT NULL,
    opening_balance NUMERIC(15,2) NOT NULL,
    closing_balance NUMERIC(15,2) NOT NULL,
    narration TEXT NOT NULL,
    math_breakdown TEXT,
    reference_id TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.wallet_ledger(created_at);
ALTER TABLE IF EXISTS public.wallet_ledger DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 13. KYC VERIFICATIONS TABLE (User Document Uploads & Admin Approval)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    pan_card_url TEXT NOT NULL,
    aadhaar_front_url TEXT NOT NULL,
    aadhaar_back_url TEXT NOT NULL,
    firm_selfie_url TEXT NOT NULL,
    cheque_url TEXT NOT NULL,
    status TEXT CHECK (status IN ('under_review', 'verified', 'rejected')) DEFAULT 'under_review',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON public.kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_verifications(status);
ALTER TABLE IF EXISTS public.kyc_verifications DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 14. API FUND REQUESTS TABLE (B2B Agent / UsePay Wallet Top-Up Requests)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.api_fund_requests (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    utr_number VARCHAR(100) NOT NULL,
    wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('cspl', 'bbps', 'payout')),
    admin_bank_account_id TEXT,
    proof_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_req_status ON public.api_fund_requests(status);
CREATE INDEX IF NOT EXISTS idx_fund_req_wallet ON public.api_fund_requests(wallet_type);
ALTER TABLE IF EXISTS public.api_fund_requests DISABLE ROW LEVEL SECURITY;



