import express from 'express';
import axios from 'axios';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Dynamic store for UsePay B2B Agent Settings (In-memory fallback if not in env)
let usepayConfig = {
  baseUrl: process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b',
  apiKey: process.env.USEPAY_API_KEY || '',
  secretKey: process.env.USEPAY_SECRET_KEY || ''
};

/**
 * GET /api/b2b/usepay-balance (Admin only)
 * Fetches real-time agent balances from UsePay B2B API (https://www.usepay.in/api/v1/b2b/balance)
 */
router.get('/usepay-balance', verifyToken, requireRoles(['admin']), async (req, res) => {
  const baseUrl = (usepayConfig.baseUrl || process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
  const apiKey = usepayConfig.apiKey || process.env.USEPAY_API_KEY || '';
  const secretKey = usepayConfig.secretKey || process.env.USEPAY_SECRET_KEY || '';

  const fallbackData = {
    balance: 25450.75,
    bbps_wallet_balance: 15450.75,
    payout_wallet_balance: 10000.00,
    cspl_wallet_balance: 12500.00,
    usable_bbps_balance: 15450.75,
    fixed_deposit_amount: 0,
    is_bbps_enabled: true,
    is_payout_enabled: true,
    is_cspl_enabled: true
  };

  if (!apiKey || !secretKey) {
    return res.status(200).json({
      success: true,
      configured: false,
      is_mock: true,
      message: 'UsePay API Credentials not yet configured. Displaying initial balance view.',
      data: fallbackData
    });
  }

  try {
    const response = await axios.get(`${baseUrl}/balance`, {
      headers: {
        'x-api-key': apiKey,
        'x-secret-key': secretKey,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    if (response.data && response.data.status === 'success') {
      return res.status(200).json({
        success: true,
        configured: true,
        is_mock: false,
        data: response.data.data,
        rawResponse: response.data
      });
    } else {
      return res.status(200).json({
        success: false,
        configured: true,
        is_mock: true,
        message: response.data?.message || 'Failed to fetch balance from UsePay API',
        data: fallbackData,
        rawResponse: response.data
      });
    }
  } catch (error) {
    console.error('[UsePay B2B API Error]:', error.response?.data || error.message);

    const is401 = error.response?.status === 401;
    const is403 = error.response?.status === 403;
    const rawApiMessage = error.response?.data?.message;

    let errorMsg = rawApiMessage || error.message;
    if (is401 && !rawApiMessage) {
      errorMsg = 'IP Whitelisting or Authentication Failed (HTTP 401 Unauthorized). Ensure your server IP is whitelisted in UsePay Agent Settings.';
    }

    return res.status(200).json({
      success: true,
      configured: true,
      is_mock: true,
      error_code: error.response?.status || 'NETWORK_ERROR',
      message: errorMsg,
      data: fallbackData
    });
  }

});

/**
 * POST /api/b2b/usepay-settings (Admin only)
 * Update UsePay B2B API Credentials (x-api-key and x-secret-key)
 */
router.post('/usepay-settings', verifyToken, requireRoles(['admin']), (req, res) => {
  const { apiKey, secretKey, baseUrl } = req.body;
  if (apiKey !== undefined) usepayConfig.apiKey = apiKey;
  if (secretKey !== undefined) usepayConfig.secretKey = secretKey;
  if (baseUrl !== undefined) usepayConfig.baseUrl = baseUrl;

  return res.status(200).json({
    success: true,
    message: 'UsePay B2B API credentials updated successfully.',
    config: {
      baseUrl: usepayConfig.baseUrl,
      hasApiKey: Boolean(usepayConfig.apiKey),
      hasSecretKey: Boolean(usepayConfig.secretKey)
    }
  });
});

// GET /api/b2b/credentials (B2B User or Admin)
router.get('/credentials', verifyToken, requireRoles(['b2b_user', 'admin']), (req, res) => {
  const creds = (db.b2b_credentials && db.b2b_credentials.find(c => c.user_id === req.user.id)) || {
    user_id: req.user.id,
    api_key: usepayConfig.apiKey || 'ak_live_aseasy_default',
    secret_key: usepayConfig.secretKey ? '••••••••••••••••' : 'sk_live_sec_default',
    webhook_url: '',
    ip_whitelist: []
  };

  return res.status(200).json({
    success: true,
    credentials: creds,
    usepayConfig: {
      baseUrl: usepayConfig.baseUrl,
      hasApiKey: Boolean(usepayConfig.apiKey),
      hasSecretKey: Boolean(usepayConfig.secretKey)
    },
    endpoints: {
      baseUrl: 'https://api.aseasyswipe.com/v1',
      payoutEndpoint: 'POST /v1/payouts/instant',
      verifyAccountEndpoint: 'POST /v1/bank/verify-account',
      balanceCheckEndpoint: 'GET /v1/wallet/balance'
    }
  });
});

// POST /api/b2b/regenerate-keys
router.post('/regenerate-keys', verifyToken, requireRoles(['b2b_user', 'admin']), (req, res) => {
  const newApiKey = 'ak_live_aseasy_' + Math.random().toString(36).substring(2, 18);
  const newSecretKey = 'sk_live_sec_' + Math.random().toString(36).substring(2, 26) + Date.now();

  if (!db.b2b_credentials) db.b2b_credentials = [];
  let creds = db.b2b_credentials.find(c => c.user_id === req.user.id);
  if (!creds) {
    creds = {
      id: 'b2b_cred_' + Date.now(),
      user_id: req.user.id,
      api_key: newApiKey,
      secret_key: newSecretKey,
      webhook_url: '',
      ip_whitelist: [],
      is_active: true,
      created_at: new Date().toISOString()
    };
    db.b2b_credentials.push(creds);
  } else {
    creds.api_key = newApiKey;
    creds.secret_key = newSecretKey;
  }

  return res.status(200).json({
    success: true,
    message: 'New API Key and Secret generated successfully! Store secret securely.',
    credentials: creds
  });
});

// POST /api/b2b/update-webhook
router.post('/update-webhook', verifyToken, requireRoles(['b2b_user', 'admin']), (req, res) => {
  const { webhook_url, ip_whitelist } = req.body;
  if (!db.b2b_credentials) db.b2b_credentials = [];
  const creds = db.b2b_credentials.find(c => c.user_id === req.user.id) || db.b2b_credentials[0] || {};

  if (webhook_url !== undefined) creds.webhook_url = webhook_url;
  if (ip_whitelist !== undefined) creds.ip_whitelist = Array.isArray(ip_whitelist) ? ip_whitelist : [ip_whitelist];

  return res.status(200).json({
    success: true,
    message: 'B2B Webhook & Whitelist configuration saved.',
    credentials: creds
  });
});

// ============================================================================
// LIVE BBPS BILL PAYMENT INTEGRATION ENDPOINTS
// ============================================================================

const getAuthHeaders = () => {
  const apiKey = usepayConfig.apiKey || process.env.USEPAY_API_KEY || '';
  const secretKey = usepayConfig.secretKey || process.env.USEPAY_SECRET_KEY || '';
  return {
    'x-api-key': apiKey,
    'x-secret-key': secretKey,
    'Content-Type': 'application/json'
  };
};

const defaultCategories = [
  { category_id: 7, category_name: "Credit Card" }
];

// Helper: Load Credit Card Billers directly from Database
const loadCreditCardBillersFromDatabase = async () => {
  if (!supabase) return db.credit_card_billers || [];
  try {
    const { data, error } = await supabase
      .from('credit_card_billers')
      .select('*');
      
    if (!error && data && data.length > 0) {
      // Filter out any non-Credit Card or eChallan billers
      const cleanData = data.filter(b => 
        (b.category_id === 7 || b.category === 'Credit Card') && 
        !b.biller_name.toLowerCase().includes('challan')
      );
      return cleanData;
    }
    return db.credit_card_billers || [];
  } catch (err) {
    console.warn('[Credit Card Billers DB Fetch Error]:', err.message);
    return db.credit_card_billers || [];
  }
};

// Helper: Save/Sync Billers directly to Database
const saveBillersToDatabase = async (billersToSync) => {
  if (!supabase || !Array.isArray(billersToSync) || billersToSync.length === 0) return;
  try {
    // 1. Delete any non-credit card / eChallan records from database
    await supabase.from('credit_card_billers').delete().or('category_id.neq.7,biller_name.ilike.%challan%');

    // 2. Filter billers strictly for Credit Card category
    const cleanBillers = billersToSync.filter(b => 
      (b.category_id === 7 || b.category === 'Credit Card') && 
      !b.biller_name.toLowerCase().includes('challan')
    );

    const rows = cleanBillers.map(b => ({
      biller_id: b.biller_id,
      biller_name: b.biller_name,
      category: 'Credit Card',
      category_id: 7,
      payment_modes: b.payment_modes || ["Cash", "UPI", "Internet Banking", "Debit Card"],
      metadata: b.metadata || {}
    }));

    if (rows.length > 0) {
      await supabase.from('credit_card_billers').upsert(rows, { onConflict: 'biller_id' });
      console.log(`[Credit Card Billers DB]: Saved ${rows.length} billers directly to database.`);
    }
  } catch (err) {
    console.warn('[Credit Card Billers DB Save Error]:', err.message);
  }
};

// In-Memory store cache initialization for Credit Card Billers (Loaded from DB)
if (!db.credit_card_billers) {
  db.credit_card_billers = [];
}

// Initial DB Fetch on server startup
loadCreditCardBillersFromDatabase().then(billers => {
  if (billers && billers.length > 0) {
    db.credit_card_billers = billers;
  }
});

/**
 * GET /api/b2b/categories
 * List supported BBPS Biller Categories (Only Credit Card)
 */
router.get('/categories', verifyToken, async (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: defaultCategories
  });
});

/**
 * GET /api/b2b/billers
 * Fetch Directory of Credit Card Billers directly from PostgreSQL Database
 */
router.get('/billers', verifyToken, async (req, res) => {
  const baseUrl = (usepayConfig.baseUrl || process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
  const { page, limit } = req.query;

  // 1. Try fetching live billers from UsePay B2B API
  try {
    const response = await axios.get(`${baseUrl}/billers`, {
      headers: getAuthHeaders(),
      params: { category_id: 7, page, limit },
      timeout: 8000
    });
    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data) && response.data.data.length > 0) {
      // Save live API billers directly into database
      await saveBillersToDatabase(response.data.data);
    }
  } catch (err) {
    console.warn('[UsePay Credit Card Billers Warning]: Serving directly from database:', err.message);
  }

  // 2. Load directly from PostgreSQL Database
  const dbBillers = await loadCreditCardBillersFromDatabase();
  if (dbBillers && dbBillers.length > 0) {
    db.credit_card_billers = dbBillers;
  }

  return res.status(200).json({
    status: 'success',
    data: db.credit_card_billers,
    pagination: {
      page: Number(page) || 1,
      limit: Number(limit) || 100,
      total_records: db.credit_card_billers.length,
      total_pages: 1
    }
  });
});


/**
 * POST /api/b2b/fetch-bill
 * Real-time Customer Bill Fetch
 */
router.post('/fetch-bill', verifyToken, async (req, res) => {
  const baseUrl = (usepayConfig.baseUrl || process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
  const { billerId, mobile, customerParams } = req.body;

  if (!billerId) {
    return res.status(400).json({ status: 'error', message: 'billerId is required.' });
  }

  // Dynamically extract real mobile number from customerParams if available
  let activeMobile = mobile;
  if (!activeMobile || activeMobile === '9876543210') {
    const mobileParam = Array.isArray(customerParams) && customerParams.find(p => p.name && p.name.toLowerCase().includes('mobile'));
    if (mobileParam && mobileParam.value) {
      activeMobile = mobileParam.value;
    }
  }
  if (!activeMobile) activeMobile = '9876543210';

  const payload = { 
    billerId, 
    mobile: activeMobile, 
    customerParams: customerParams || [] 
  };

  const executeFetchWithRetry = async (attemptsLeft = 2) => {
    try {
      console.log(`[UsePay Fetch-Bill Attempt ${3 - attemptsLeft} Payload]:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(`${baseUrl}/fetch-bill`, payload, {
        headers: getAuthHeaders(),
        timeout: 20000
      });

      console.log(`[UsePay Fetch-Bill Attempt ${3 - attemptsLeft} Response]:`, JSON.stringify(response.data, null, 2));

      // Check if response returned BFR009 / Technical Error from Biller Node
      const isTechnicalError = response.data?.status === 'error' && (
        response.data?.data?.billFetchResponse?.errorInfo?.error?.errorCode === 'BFR009' ||
        response.data?.data?.billerResponse?.errorInfo?.error?.errorCode === 'BFR009' ||
        (response.data?.message && response.data.message.toLowerCase().includes('technical error'))
      );

      if (isTechnicalError && attemptsLeft > 1) {
        console.warn('[UsePay Fetch-Bill]: BFR009 Technical Error detected from Biller Node. Retrying in 600ms...');
        await new Promise(resolve => setTimeout(resolve, 600));
        return await executeFetchWithRetry(attemptsLeft - 1);
      }

      return res.status(response.status).json(response.data);
    } catch (err) {
      console.error(`[UsePay Fetch-Bill Error Attempt ${3 - attemptsLeft}]:`, err.response?.data || err.message);
      if (attemptsLeft > 1) {
        console.warn('[UsePay Fetch-Bill]: Connection error/timeout. Retrying in 600ms...');
        await new Promise(resolve => setTimeout(resolve, 600));
        return await executeFetchWithRetry(attemptsLeft - 1);
      }
      if (err.response && err.response.data) {
        return res.status(err.response.status || 400).json(err.response.data);
      }
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to connect to UsePay B2B server.'
      });
    }
  };

  return await executeFetchWithRetry(2);
});

// Helper: Calculate service charge from charge slabs (same slabs as offline bill requests)
const calculateServiceCharge = async (amount) => {
  let slabs = [];

  if (supabase) {
    try {
      const { data } = await supabase.from('bill_charge_slabs').select('*').order('min_amount', { ascending: true });
      if (data && data.length > 0) slabs = data;
    } catch (e) {
      // Fallback
    }
  }

  if (slabs.length === 0) {
    slabs = db.charge_slabs || [
      { min_amount: 1, max_amount: 50000, charge_amount: 25 },
      { min_amount: 50001, max_amount: 100000, charge_amount: 50 }
    ];
  }

  const amt = Number(amount);
  const matchingSlab = slabs.find(s => amt >= Number(s.min_amount) && amt <= Number(s.max_amount));

  if (matchingSlab) {
    return Number(matchingSlab.charge_amount);
  }

  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  return 100;
};

/**
 * GET /api/b2b/calculate-charge?amount=10000
 * Calculate service charge & total deduction for a bill payment
 */
router.get('/calculate-charge', verifyToken, async (req, res) => {
  const amount = Number(req.query.amount || 0);
  const serviceCharge = await calculateServiceCharge(amount);
  const totalDeduction = amount + serviceCharge;

  let currentUser = null;
  if (supabase) {
    try {
      const { data } = await supabase.from('users_profiles').select('wallet_balance').eq('id', req.user.id).maybeSingle();
      if (data) currentUser = data;
    } catch (e) {}
  }
  if (!currentUser) {
    currentUser = (db.users || []).find(u => u.id === req.user.id);
  }

  const walletBalance = Number(currentUser?.wallet_balance || 0);

  return res.status(200).json({
    success: true,
    amount,
    serviceCharge,
    totalDeduction,
    walletBalance,
    hasSufficientBalance: walletBalance >= totalDeduction
  });
});

/**
 * POST /api/b2b/pay-bill
 * Execute BBPS Bill Payment via UsePay B2B API with Slab Charge Deduction & Auto-Refund
 */
router.post('/pay-bill', verifyToken, async (req, res) => {
  const baseUrl = (usepayConfig.baseUrl || process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
  const { 
    billerId, amount, mobile, paymentMode, client_transaction_id, 
    fetchRequestId, customerParams, billerResponseInfo, additionalInfo, customerPan 
  } = req.body;

  if (!billerId || !amount) {
    return res.status(400).json({ status: 'error', message: 'billerId and amount are required.' });
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) {
    return res.status(400).json({ status: 'error', message: 'Valid payment amount greater than ₹0 is required.' });
  }

  const generatedClientTxnId = client_transaction_id || ('TXN_ORD_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000));

  // 1. DOUBLE PAYMENT GUARD (Check for duplicate client_transaction_id)
  const existingTxn = (db.bill_payments || []).find(t => t.client_transaction_id === generatedClientTxnId);
  if (existingTxn && existingTxn.status !== 'failed') {
    return res.status(400).json({ status: 'failed', message: 'Duplicate transaction submission detected. Please wait.' });
  }

  // 2. CALCULATE SLAB SERVICE CHARGE & TOTAL DEDUCTION
  const serviceCharge = await calculateServiceCharge(numAmount);
  const totalDeduction = numAmount + serviceCharge;

  // 3. CHECK USER WALLET BALANCE
  let currentUser = null;
  if (supabase) {
    try {
      const { data } = await supabase.from('users_profiles').select('*').eq('id', req.user.id).maybeSingle();
      if (data) currentUser = data;
    } catch (e) {
      console.warn('[BBPS Wallet Profile Fetch Warning]:', e.message);
    }
  }
  if (!currentUser) {
    currentUser = (db.users || []).find(u => u.id === req.user.id);
  }

  const currentWalletBalance = Number(currentUser?.wallet_balance || 0);

  if (currentWalletBalance < totalDeduction) {
    return res.status(400).json({
      status: 'failed',
      message: `Insufficient Wallet Balance! Required: ₹${totalDeduction.toLocaleString('en-IN')} (Bill Amount: ₹${numAmount.toLocaleString('en-IN')} + Slab Charge: ₹${serviceCharge.toLocaleString('en-IN')}), Available Balance: ₹${currentWalletBalance.toLocaleString('en-IN')}`
    });
  }

  // 4. ATOMICALLY DEDUCT WALLET BALANCE BEFORE GATEWAY EXECUTION
  const balanceAfterDeduction = currentWalletBalance - totalDeduction;
  if (currentUser) currentUser.wallet_balance = balanceAfterDeduction;

  const memUser = (db.users || []).find(u => u.id === req.user.id);
  if (memUser) memUser.wallet_balance = balanceAfterDeduction;

  if (supabase) {
    try {
      await supabase.from('users_profiles').update({
        wallet_balance: balanceAfterDeduction,
        updated_at: new Date().toISOString()
      }).eq('id', req.user.id);
      console.log(`[BBPS Wallet Deduction]: Deducted ₹${totalDeduction} (Bill: ₹${numAmount} + Charge: ₹${serviceCharge}) from User ${req.user.id}. New Balance: ₹${balanceAfterDeduction}`);
    } catch (e) {
      console.warn('[BBPS Wallet Update Warning]:', e.message);
    }
  }

  const targetBiller = (db.credit_card_billers && db.credit_card_billers.find(b => b.biller_id === billerId)) || { biller_name: billerId };
  const customerName = billerResponseInfo?.customerName || req.body.billerResponse?.customerName || 'VALUED CARD HOLDER';

  // 5. PRE-INSERT TRANSACTION RECORD IN DATABASE
  const newTxnEntry = {
    id: generatedClientTxnId,
    user_id: req.user.id,
    biller_id: billerId,
    biller_name: targetBiller.biller_name || billerId,
    customer_name: customerName,
    customer_mobile: mobile || '9876543210',
    amount: numAmount,
    service_charge: serviceCharge,
    total_deducted: totalDeduction,
    payment_mode: paymentMode || 'Cash',
    client_transaction_id: generatedClientTxnId,
    fetch_request_id: fetchRequestId || null,
    status: 'pending',
    status_message: 'Initiated & Sent to Gateway',
    customer_params: customerParams || [],
    created_at: new Date().toISOString()
  };

  if (!db.bill_payments) db.bill_payments = [];
  db.bill_payments.unshift(newTxnEntry);

  if (supabase) {
    try {
      await supabase.from('bbps_bill_payments').upsert(newTxnEntry, { onConflict: 'client_transaction_id' });
    } catch (dbErr) {
      console.warn('[BBPS DB Pre-Entry Warning]:', dbErr.message);
    }
  }

  // Helper for Auto Refund on Gateway Failure
  const refundUserWallet = async (reason) => {
    const balanceAfterRefund = (currentUser?.wallet_balance || balanceAfterDeduction) + totalDeduction;
    if (currentUser) currentUser.wallet_balance = balanceAfterRefund;
    if (memUser) memUser.wallet_balance = balanceAfterRefund;

    if (supabase) {
      try {
        await supabase.from('users_profiles').update({
          wallet_balance: balanceAfterRefund,
          updated_at: new Date().toISOString()
        }).eq('id', req.user.id);
        console.log(`[BBPS Wallet Refund]: Refunded ₹${totalDeduction} to User ${req.user.id}. New Balance: ₹${balanceAfterRefund}. Reason: ${reason}`);
      } catch (e) {
        console.warn('[BBPS Wallet Refund Error]:', e.message);
      }
    }

    newTxnEntry.refunded = true;
    newTxnEntry.refunded_amount = totalDeduction;
  };

  // 6. EXECUTE LIVE USEPAY B2B PAY-BILL API
  try {
    const targetBillerInfo = billerResponseInfo !== undefined ? billerResponseInfo : (req.body.billerResponse !== undefined ? req.body.billerResponse : undefined);

    const extractAdditionalInfo = (body) => {
      if (!body) return undefined;
      const bfrAdd = body.billFetchResponse?.additionalInfo;
      if (bfrAdd) {
        if (Array.isArray(bfrAdd) && bfrAdd.length > 0) return bfrAdd;
        if (typeof bfrAdd === 'object' && Object.keys(bfrAdd).length > 0) return bfrAdd;
      }
      const topAdd = body.additionalInfo;
      if (topAdd) {
        if (Array.isArray(topAdd) && topAdd.length > 0) return topAdd;
        if (typeof topAdd === 'object' && Object.keys(topAdd).length > 0) return topAdd;
      }
      const brAdd = body.billerResponseInfo?.additionalInfo || body.billerResponse?.additionalInfo;
      if (brAdd) {
        if (Array.isArray(brAdd) && brAdd.length > 0) return brAdd;
        if (typeof brAdd === 'object' && Object.keys(brAdd).length > 0) return brAdd;
      }
      if (bfrAdd !== undefined) return bfrAdd;
      if (topAdd !== undefined) return topAdd;
      return undefined;
    };

    const targetAddInfo = extractAdditionalInfo(req.body);

    const payload = {
      billerId,
      amount: numAmount,
      mobile: String(mobile || '9876543210'),
      paymentMode: String(paymentMode || 'Cash'),
      client_transaction_id: generatedClientTxnId,
      fetchRequestId: fetchRequestId || undefined,
      customerParams: Array.isArray(customerParams) ? customerParams : []
    };

    if (targetBillerInfo !== undefined) {
      payload.billerResponseInfo = targetBillerInfo;
    }
    if (targetAddInfo !== undefined) {
      payload.additionalInfo = targetAddInfo;
    }
    if (customerPan) {
      payload.customerPan = customerPan;
    }

    console.log('[UsePay Pay-Bill Request Payload]:', JSON.stringify(payload, null, 2));

    const response = await axios.post(`${baseUrl}/pay-bill`, payload, {
      headers: getAuthHeaders(),
      timeout: 20000
    });

    console.log('[UsePay Pay-Bill Response]:', JSON.stringify(response.data, null, 2));

    const isSuccess = response.data && (response.data.status === 'success' || response.data.payment_status === 'success');
    const isPending = response.data && (response.data.status === 'pending' || response.data.payment_status === 'pending');

    // If API returned failure status from gateway -> AUTO REFUND WALLET
    if (!isSuccess && !isPending) {
      await refundUserWallet(response.data?.message || 'Gateway payment failed');
    }

    const statusVal = isSuccess ? 'success' : (isPending ? 'pending' : 'failed');
    const apiTxnId = response.data?.transaction_id || response.data?.data?.transaction_id || ('BBPSU' + Date.now());
    const bbpsRefId = response.data?.bbps_txn_ref_id || response.data?.data?.bbps_txn_ref_id || response.data?.data?.ExtBillPayResponse?.txnRefId || null;
    const msg = response.data?.message || (isSuccess ? 'Bill paid successfully' : 'Payment failed');

    newTxnEntry.status = statusVal;
    newTxnEntry.api_transaction_id = apiTxnId;
    newTxnEntry.bbps_txn_ref_id = bbpsRefId;
    newTxnEntry.status_message = msg;

    if (supabase) {
      try {
        await supabase.from('bbps_bill_payments').update({
          status: statusVal,
          api_transaction_id: apiTxnId,
          bbps_txn_ref_id: bbpsRefId,
          status_message: msg,
          refunded: newTxnEntry.refunded || false,
          refunded_amount: newTxnEntry.refunded_amount || 0,
          updated_at: new Date().toISOString()
        }).eq('client_transaction_id', generatedClientTxnId);
      } catch (e) {
        console.warn('[BBPS DB Update Warning]:', e.message);
      }
    }

    return res.status(response.status).json({
      ...response.data,
      service_charge: serviceCharge,
      total_deducted: totalDeduction,
      refunded: newTxnEntry.refunded || false,
      refunded_amount: newTxnEntry.refunded_amount || 0
    });

  } catch (err) {
    console.error('[UsePay Pay-Bill Error]:', err.response?.data || err.message);

    const errMsg = err.response?.data?.message || err.message || 'Payment API call failed';
    newTxnEntry.status = 'failed';
    newTxnEntry.status_message = errMsg;

    // AUTO REFUND WALLET ON EXCEPTION / TIMEOUT / HTTP ERROR
    await refundUserWallet(errMsg);

    if (supabase) {
      try {
        await supabase.from('bbps_bill_payments').update({
          status: 'failed',
          status_message: errMsg,
          refunded: true,
          refunded_amount: totalDeduction,
          updated_at: new Date().toISOString()
        }).eq('client_transaction_id', generatedClientTxnId);
      } catch (e) {
        console.warn('[BBPS DB Failure Update Warning]:', e.message);
      }
    }

    return res.status(err.response?.status || 400).json({
      status: 'failed',
      message: `${errMsg}. Total amount ₹${totalDeduction.toLocaleString('en-IN')} (Bill: ₹${numAmount} + Charge: ₹${serviceCharge}) has been automatically refunded to your wallet.`,
      refunded: true,
      refunded_amount: totalDeduction
    });
  }
});

/**
 * GET /api/b2b/history
 * Fetch Recent Credit Card Bill Payments History (Admin gets all, Users get own)
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let historyData = [];

    if (supabase) {
      let query = supabase
        .from('bbps_bill_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isAdmin) {
        query = query.eq('user_id', req.user.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        historyData = data;
      }
    }

    if (historyData.length === 0 && Array.isArray(db.bill_payments)) {
      historyData = isAdmin 
        ? db.bill_payments 
        : db.bill_payments.filter(p => p.user_id === req.user.id);
    }

    return res.status(200).json({
      status: 'success',
      data: historyData
    });
  } catch (err) {
    console.error('[BBPS History Fetch Error]:', err.message);
    return res.status(200).json({
      status: 'success',
      data: (db.bill_payments || []).filter(p => req.user.role === 'admin' || p.user_id === req.user?.id)
    });
  }
});

/**
 * GET /api/b2b/status/:transaction_id (Admin only)
 * Check Live Status & Auto-Refund via UsePay B2B Gateway API
 */
router.get('/status/:transaction_id', verifyToken, requireRoles(['admin']), async (req, res) => {
  const baseUrl = (usepayConfig.baseUrl || process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
  const { transaction_id } = req.params;

  if (!transaction_id) {
    return res.status(400).json({ status: 'error', message: 'transaction_id is required.' });
  }

  // 1. Try Live UsePay Gateway API Status Check
  try {
    const response = await axios.get(`${baseUrl}/status/${encodeURIComponent(transaction_id)}`, {
      headers: getAuthHeaders(),
      timeout: 10000
    });

    if (response.data) {
      const liveData = response.data.data || {};
      const liveStatus = (liveData.current_status || liveData.status || response.data.status || 'pending').toLowerCase();
      const isSuccess = liveStatus === 'success' || liveStatus === 'approved';
      const isFailed = liveStatus === 'failed' || liveStatus === 'rejected';

      const updatedStatus = isSuccess ? 'success' : isFailed ? 'failed' : 'pending';

      // Update database status
      if (supabase) {
        try {
          await supabase.from('bbps_bill_payments').update({
            status: updatedStatus,
            bbps_txn_ref_id: liveData.bbps_txn_ref_id || undefined,
            api_transaction_id: liveData.transaction_id || undefined,
            status_message: liveData.message || (isSuccess ? 'Confirmed by Biller' : 'Live status checked'),
            updated_at: new Date().toISOString()
          }).or(`client_transaction_id.eq.${transaction_id},id.eq.${transaction_id},api_transaction_id.eq.${transaction_id}`);
        } catch (dbErr) {
          console.warn('[Status Sync DB Error]:', dbErr.message);
        }
      }

      if (Array.isArray(db.bill_payments)) {
        const match = db.bill_payments.find(p => p.client_transaction_id === transaction_id || p.id === transaction_id || p.api_transaction_id === transaction_id);
        if (match) {
          match.status = updatedStatus;
          match.bbps_txn_ref_id = liveData.bbps_txn_ref_id || match.bbps_txn_ref_id;
          match.status_message = liveData.message || match.status_message;
        }
      }

      return res.status(response.status).json(response.data);
    }
  } catch (err) {
    console.warn('[UsePay Live Status Warning]: Serving local status check:', err.response?.data || err.message);
  }

  // 2. Query Local DB / Memory Record
  let localRecord = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('bbps_bill_payments')
        .select('*')
        .or(`client_transaction_id.eq.${transaction_id},id.eq.${transaction_id},api_transaction_id.eq.${transaction_id}`)
        .limit(1);

      if (data && data.length > 0) {
        localRecord = data[0];
      }
    } catch (e) {}
  }

  if (!localRecord && Array.isArray(db.bill_payments)) {
    localRecord = db.bill_payments.find(p => p.client_transaction_id === transaction_id || p.id === transaction_id || p.api_transaction_id === transaction_id);
  }

  const currentStat = (localRecord?.status || 'pending').toLowerCase();
  const nowIso = new Date().toISOString();

  if (currentStat === 'success' || currentStat === 'approved') {
    return res.status(200).json({
      status: 'success',
      payment_status: 'success',
      data: {
        transaction_id: localRecord?.api_transaction_id || ('BBPSU' + Date.now()),
        client_transaction_id: localRecord?.client_transaction_id || transaction_id,
        bbps_txn_ref_id: localRecord?.bbps_txn_ref_id || ('CC' + Math.random().toString(36).substring(2, 18).toUpperCase()),
        approval_ref_number: '1234567890',
        current_status: 'success',
        status: 'success',
        payment_status: 'success',
        bbps_status: 'SUCCESS',
        polled_at: nowIso
      }
    });
  }

  if (currentStat === 'failed' || currentStat === 'rejected') {
    return res.status(200).json({
      status: 'failed',
      payment_status: 'failed',
      data: {
        transaction_id: localRecord?.api_transaction_id || ('BBPSU' + Date.now()),
        client_transaction_id: localRecord?.client_transaction_id || transaction_id,
        bbps_txn_ref_id: 'N/A',
        current_status: 'failed',
        status: 'failed',
        payment_status: 'failed',
        bbps_status: 'FAILED_GATEWAY_ERROR',
        message: localRecord?.status_message || 'Bill payment failed to connect to biller gateway. BBPS wallet automatically refunded.',
        refund_status: 'REFUNDED',
        refunded_amount: Number(localRecord?.amount || 0)
      }
    });
  }

  return res.status(202).json({
    status: 'pending',
    payment_status: 'pending',
    data: {
      transaction_id: localRecord?.api_transaction_id || ('BBPSU' + Date.now()),
      client_transaction_id: localRecord?.client_transaction_id || transaction_id,
      bbps_txn_ref_id: localRecord?.bbps_txn_ref_id || 'PENDING',
      current_status: 'pending',
      status: 'pending',
      payment_status: 'pending',
      bbps_status: 'PENDING',
      polled_at: nowIso
    }
  });
});

export default router;


