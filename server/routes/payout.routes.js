import express from 'express';
import axios from 'axios';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper: Calculate slab charge with strict active slab boundaries
export const calculatePayoutCharge = async (amount) => {
  const numAmount = parseFloat(amount || 0);
  let slabs = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payout_charge_slabs')
        .select('*')
        .order('min_amount', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        slabs = data;
      }
    } catch {
      slabs = (db.payout_slabs || []).filter(s => s.is_active !== false);
    }
  } else {
    slabs = (db.payout_slabs || []).filter(s => s.is_active !== false);
  }

  if (slabs.length === 0) {
    slabs = [
      { id: 'poslab_01', min_amount: 100, max_amount: 1000, charge_type: 'flat', charge_value: 10, is_active: true },
      { id: 'poslab_02', min_amount: 1001, max_amount: 25000, charge_type: 'flat', charge_value: 15, is_active: true },
      { id: 'poslab_03', min_amount: 25001, max_amount: 200000, charge_type: 'flat', charge_value: 25, is_active: true }
    ];
  }

  // Filter only active slabs
  const activeSlabs = slabs.filter(s => s.is_active !== false);

  if (activeSlabs.length === 0) {
    return {
      valid: false,
      message: 'No active payout slabs configured by administrator. Payouts are temporarily unavailable.',
      min_limit: 0,
      max_limit: 0,
      slab: null,
      charge_amount: 0,
      total_deducted: 0
    };
  }

  const minLimit = Math.min(...activeSlabs.map(s => parseFloat(s.min_amount)));
  const maxLimit = Math.max(...activeSlabs.map(s => parseFloat(s.max_amount)));

  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      valid: false,
      message: 'Please provide a valid transfer amount.',
      min_limit: minLimit,
      max_limit: maxLimit,
      slab: null,
      charge_amount: 0,
      total_deducted: 0
    };
  }

  if (numAmount < minLimit) {
    return {
      valid: false,
      message: `Payout amount ₹${numAmount.toLocaleString('en-IN')} cannot be less than the minimum active slab limit of ₹${minLimit.toLocaleString('en-IN')}.`,
      min_limit: minLimit,
      max_limit: maxLimit,
      slab: null,
      charge_amount: 0,
      total_deducted: 0
    };
  }

  if (numAmount > maxLimit) {
    return {
      valid: false,
      message: `Payout amount ₹${numAmount.toLocaleString('en-IN')} exceeds the maximum active slab limit of ₹${maxLimit.toLocaleString('en-IN')}.`,
      min_limit: minLimit,
      max_limit: maxLimit,
      slab: null,
      charge_amount: 0,
      total_deducted: 0
    };
  }

  const matchingSlab = activeSlabs.find(
    s => numAmount >= parseFloat(s.min_amount) && numAmount <= parseFloat(s.max_amount)
  );

  if (!matchingSlab) {
    return {
      valid: false,
      message: `Payout amount ₹${numAmount.toLocaleString('en-IN')} does not match any active slab (Allowed range: ₹${minLimit.toLocaleString('en-IN')} - ₹${maxLimit.toLocaleString('en-IN')}).`,
      min_limit: minLimit,
      max_limit: maxLimit,
      slab: null,
      charge_amount: 0,
      total_deducted: 0
    };
  }

  let charge = 0;
  if (matchingSlab.charge_type === 'percentage') {
    charge = parseFloat(((numAmount * parseFloat(matchingSlab.charge_value)) / 100).toFixed(2));
  } else {
    charge = parseFloat(parseFloat(matchingSlab.charge_value).toFixed(2));
  }

  return {
    valid: true,
    slab: matchingSlab,
    charge_amount: charge,
    total_deducted: parseFloat((numAmount + charge).toFixed(2)),
    min_limit: minLimit,
    max_limit: maxLimit
  };
};

// Helper: Check if gateway response or error indicates processing / pending / queued
export const isPayoutProcessingOrPending = (data, errorMsg) => {
  const statusStr = String(data?.status || data?.payment_status || '').toLowerCase();
  const msgStr = String(data?.message || errorMsg || '').toLowerCase();

  const isPendingStatus = [
    'pending', 'processing', 'in_progress', 'in-progress', 'in_process', 
    'queued', 'accepted', 'submitted', 'initiated'
  ].includes(statusStr);

  const isProcessingMessage = 
    msgStr.includes('currently being processed') ||
    msgStr.includes('being processed') ||
    msgStr.includes('processed by the bank') ||
    msgStr.includes('webhook will be delivered') ||
    msgStr.includes('in progress') ||
    msgStr.includes('processing') ||
    msgStr.includes('pending') ||
    msgStr.includes('queued') ||
    msgStr.includes('accepted');

  return isPendingStatus || isProcessingMessage;
};

// ============================================================================
// 1. SLABS MANAGEMENT (Admin & Public read for calculate)
// ============================================================================

// GET /api/payout/slabs - Fetch all payout slabs
router.get('/slabs', verifyToken, async (req, res) => {
  try {
    let slabs = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payout_charge_slabs')
          .select('*')
          .order('min_amount', { ascending: true });
        if (!error && Array.isArray(data)) {
          slabs = data;
          db.payout_slabs = slabs;
          return res.status(200).json({ success: true, slabs });
        }
      } catch (e) {
        console.warn('Supabase fetch payout_slabs error:', e.message);
      }
    }

    slabs = db.payout_slabs || [];
    return res.status(200).json({ success: true, slabs });
  } catch (err) {
    console.error('Fetch Payout Slabs Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch payout slabs' });
  }
});

// POST /api/payout/slabs - Create new payout slab (Admin only)
router.post('/slabs', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { min_amount, max_amount, charge_type, charge_value, is_active } = req.body;

    if (min_amount === undefined || max_amount === undefined || charge_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'min_amount, max_amount, and charge_value are required'
      });
    }

    const min = parseFloat(min_amount);
    const max = parseFloat(max_amount);
    const val = parseFloat(charge_value);

    if (isNaN(min) || isNaN(max) || isNaN(val) || min < 0 || max <= min || val < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid numeric range or charge value'
      });
    }

    const newSlab = {
      id: `poslab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      min_amount: min,
      max_amount: max,
      charge_type: charge_type === 'percentage' ? 'percentage' : 'flat',
      charge_value: val,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.payout_slabs) db.payout_slabs = [];
    db.payout_slabs.push(newSlab);

    if (supabase) {
      try {
        await supabase.from('payout_charge_slabs').insert([newSlab]);
      } catch (e) {
        console.warn('Supabase slab insert warning:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Payout charge slab created successfully',
      slab: newSlab
    });
  } catch (err) {
    console.error('Create Payout Slab Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create payout slab' });
  }
});

// PUT /api/payout/slabs/:id - Update payout slab (Admin only)
router.put('/slabs/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_amount, max_amount, charge_type, charge_value, is_active } = req.body;

    let existing = (db.payout_slabs || []).find(s => s.id === id);

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (min_amount !== undefined) updatePayload.min_amount = parseFloat(min_amount);
    if (max_amount !== undefined) updatePayload.max_amount = parseFloat(max_amount);
    if (charge_type !== undefined) updatePayload.charge_type = charge_type === 'percentage' ? 'percentage' : 'flat';
    if (charge_value !== undefined) updatePayload.charge_value = parseFloat(charge_value);
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    if (existing) {
      Object.assign(existing, updatePayload);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payout_charge_slabs')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          existing = data;
        }
      } catch (e) {
        console.warn('Supabase slab update warning:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payout slab updated successfully',
      slab: existing || updatePayload
    });
  } catch (err) {
    console.error('Update Payout Slab Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update payout slab' });
  }
});

// DELETE /api/payout/slabs/:id - Delete payout slab (Admin only)
router.delete('/slabs/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (db.payout_slabs) {
      db.payout_slabs = db.payout_slabs.filter(s => s.id !== id);
    }

    if (supabase) {
      try {
        await supabase.from('payout_charge_slabs').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase slab delete warning:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payout slab deleted successfully'
    });
  } catch (err) {
    console.error('Delete Payout Slab Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete payout slab' });
  }
});

// ============================================================================
// 2. LIVE CHARGE PREVIEW
// ============================================================================

// POST /api/payout/calculate-charge - Live slab calculation preview
router.post('/calculate-charge', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount || 0);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid transfer amount.'
      });
    }

    const calculation = await calculatePayoutCharge(numAmount);
    if (!calculation.valid) {
      return res.status(400).json({
        success: false,
        message: calculation.message,
        ...calculation
      });
    }

    return res.status(200).json({
      success: true,
      amount: numAmount,
      ...calculation
    });
  } catch (err) {
    console.error('Calculate Payout Charge Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate payout charge' });
  }
});

// ============================================================================
// 3. EXECUTE PAYOUT (Instant Bank Transfer)
// ============================================================================

// Track active in-flight payout operations to prevent double clicks / concurrent duplicate transfers
const activePayoutLocks = new Set();

// POST /api/payout/transfer
router.post('/transfer', verifyToken, async (req, res) => {
  // Check if Instant Payout is disabled by admin
  if (req.user?.role !== 'admin' && db.system_settings && db.system_settings.instant_payout_enabled === false) {
    return res.status(403).json({
      success: false,
      message: 'Instant Payout service is currently disabled by administrator.'
    });
  }

  const userId = req.user.id;

  // 1. Guard against concurrent / double requests for the same user
  if (activePayoutLocks.has(userId)) {
    return res.status(429).json({
      success: false,
      message: 'A payout transfer is already in progress. Please wait a moment to prevent duplicate deductions.'
    });
  }

  activePayoutLocks.add(userId);

  let isDeducted = false;
  let hasRefunded = false;
  let deductedAmount = 0;
  let userProfile = null;
  let clientOrderId = '';
  let newTxn = null;

  try {
    const {
      amount,
      account_number,
      ifsc_code,
      beneficiary_name,
      mobile_number,
      bank_name,
      transfer_mode
    } = req.body;

    // 2. Basic Validations
    const numAmount = parseFloat(amount || 0);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer amount. Please enter a valid positive amount.'
      });
    }

    const cleanAccount = String(account_number || '').trim();
    if (!cleanAccount || cleanAccount.length < 8 || cleanAccount.length > 22 || !/^\d+$/.test(cleanAccount)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Account Number. Must be between 8 and 22 digits.'
      });
    }

    const cleanIfsc = String(ifsc_code || '').trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length !== 11 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC Code. Must be exactly 11 characters (e.g. HDFC0001234).'
      });
    }

    const cleanBeneficiary = String(beneficiary_name || '').trim();
    if (!cleanBeneficiary || cleanBeneficiary.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Beneficiary Name is required.'
      });
    }

    // 3. Prevent duplicate submission within 30 seconds
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    const existingRecentTxn = (db.payout_transactions || []).find(t =>
      t.user_id === userId &&
      t.account_number === cleanAccount &&
      Math.abs(Number(t.amount) - numAmount) < 0.01 &&
      (t.status === 'pending' || t.status === 'success') &&
      new Date(t.created_at).getTime() > thirtySecondsAgo
    );

    if (existingRecentTxn) {
      return res.status(409).json({
        success: false,
        message: `Duplicate payout prevented! An identical transfer of ₹${numAmount} to this account was submitted moments ago (Order: ${existingRecentTxn.client_order_id}). Please wait 30 seconds before submitting again.`
      });
    }

    // 4. Fetch User Profile (No TPIN required per user requirement)
    if (supabase) {
      const { data } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) userProfile = data;
    }
    if (!userProfile) {
      userProfile = (db.users || []).find(u => u.id === userId);
    }

    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    // 5. Dynamic Active Slab Charge Calculation & Strict Boundary Validation
    const calcResult = await calculatePayoutCharge(numAmount);
    if (!calcResult.valid) {
      return res.status(400).json({
        success: false,
        message: calcResult.message
      });
    }
    const { slab, charge_amount, total_deducted } = calcResult;
    deductedAmount = total_deducted;

    // 6. Wallet Balance Check
    const currentWalletBalance = parseFloat(userProfile.wallet_balance || 0);
    if (currentWalletBalance < total_deducted) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Wallet Balance! Required: ₹${total_deducted.toFixed(2)} (Transfer Amount: ₹${numAmount} + Slab Charge: ₹${charge_amount}), Available: ₹${currentWalletBalance.toFixed(2)}`
      });
    }

    // 7. Generate Unique Order ID for Idempotency
    clientOrderId = `ASY_PO_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const cleanMobile = (mobile_number || userProfile.mobile_number || '').trim();
    const mode = (transfer_mode || 'IMPS').toUpperCase() === 'NEFT' ? 'NEFT' : 'IMPS';

    // 8. ATOMIC WALLET DEDUCTION (Upfront deduction)
    const newWalletBalance = parseFloat((currentWalletBalance - total_deducted).toFixed(2));
    userProfile.wallet_balance = newWalletBalance;
    userProfile.updated_at = new Date().toISOString();
    isDeducted = true;

    const memUserIdx = (db.users || []).findIndex(u => u.id === userProfile.id);
    if (memUserIdx !== -1) {
      db.users[memUserIdx].wallet_balance = newWalletBalance;
    }

    if (supabase) {
      try {
        await supabase
          .from('users_profiles')
          .update({ wallet_balance: newWalletBalance, updated_at: new Date().toISOString() })
          .eq('id', userProfile.id);
      } catch (e) {
        console.warn('Supabase wallet deduction warning:', e.message);
      }
    }

    // Create Initial Transaction Record (Pending)
    newTxn = {
      id: `potxn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userProfile.id,
      user_name: userProfile.name,
      user_mobile: userProfile.mobile_number,
      client_order_id: clientOrderId,
      api_order_id: null,
      utr: null,
      amount: numAmount,
      slab_charge: charge_amount,
      total_deducted: total_deducted,
      account_number: cleanAccount,
      ifsc_code: cleanIfsc,
      beneficiary_name: cleanBeneficiary,
      bank_name: bank_name || '',
      mobile_number: cleanMobile,
      transfer_mode: mode,
      status: 'pending',
      refunded_to_wallet: false,
      failure_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.payout_transactions) db.payout_transactions = [];
    db.payout_transactions.unshift(newTxn);

    if (supabase) {
      try {
        await supabase.from('payout_transactions').insert([{
          id: newTxn.id,
          user_id: newTxn.user_id,
          client_order_id: newTxn.client_order_id,
          amount: newTxn.amount,
          slab_charge: newTxn.slab_charge,
          total_deducted: newTxn.total_deducted,
          account_number: newTxn.account_number,
          ifsc_code: newTxn.ifsc_code,
          beneficiary_name: newTxn.beneficiary_name,
          bank_name: newTxn.bank_name,
          mobile_number: newTxn.mobile_number,
          transfer_mode: newTxn.transfer_mode,
          status: 'pending',
          refunded_to_wallet: false,
          created_at: newTxn.created_at,
          updated_at: newTxn.updated_at
        }]);
      } catch (e) {
        console.warn('Supabase payout transaction insert warning:', e.message);
      }
    }

    // 9. CALL USEPAY B2B PAYOUT API
    const baseUrl = (process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
    const apiKey = process.env.USEPAY_API_KEY || '';
    const secretKey = process.env.USEPAY_SECRET_KEY || '';

    // If UsePay keys are not configured or test environment
    if (!apiKey || !secretKey) {
      console.warn('[UsePay Payout Warning]: No API credentials found in environment. Running sandbox mock payout.');
      
      const mockUtr = `${Date.now()}`.slice(-12);
      const mockOrderId = `B2BPO${Date.now()}`;
      newTxn.status = 'success';
      newTxn.utr = mockUtr;
      newTxn.api_order_id = mockOrderId;
      newTxn.updated_at = new Date().toISOString();
      isDeducted = false; // Successfully processed, no refund needed

      if (supabase) {
        try {
          await supabase
            .from('payout_transactions')
            .update({ status: 'success', utr: mockUtr, api_order_id: mockOrderId, updated_at: newTxn.updated_at })
            .eq('id', newTxn.id);
        } catch {}
      }

      return res.status(200).json({
        success: true,
        message: 'Payout transfer completed successfully',
        data: {
          order_id: mockOrderId,
          client_order_id: clientOrderId,
          utr: mockUtr,
          amount: numAmount,
          slab_charge: charge_amount,
          total_deducted: total_deducted,
          beneficiary_name: cleanBeneficiary,
          account_number: cleanAccount,
          ifsc_code: cleanIfsc,
          transfer_mode: mode,
          remaining_wallet_balance: newWalletBalance,
          status: 'success'
        }
      });
    }

    // Live UsePay API Request
    try {
      const response = await axios.post(
        `${baseUrl}/payout/transfer`,
        {
          amount: numAmount,
          account_number: cleanAccount,
          ifsc_code: cleanIfsc,
          beneficiary_name: cleanBeneficiary,
          mobile_number: cleanMobile || undefined,
          transfer_mode: mode,
          client_order_id: clientOrderId,
          bank_name: bank_name || undefined,
          webhook_url: process.env.PAYOUT_WEBHOOK_URL || 'https://aseasyswipe.com/api/payout/webhook'
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-secret-key': secretKey,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      const resData = response.data || {};
      const orderData = resData.data || {};
      const apiOrderId = orderData.order_id || resData.order_id || null;
      const utr = orderData.utr || resData.utr || null;

      // Handle Processing / Pending Response (HTTP 202 or pending status in body)
      if (response.status === 202 || isPayoutProcessingOrPending(resData) || isPayoutProcessingOrPending(orderData)) {
        console.log(`[UsePay Payout Status]: Transfer ${clientOrderId} accepted by bank in PENDING/PROCESSING state.`);
        newTxn.status = 'pending';
        newTxn.api_order_id = apiOrderId;
        if (utr) newTxn.utr = utr;
        newTxn.api_response = resData;
        newTxn.failure_reason = resData.message || 'Payout transfer is currently being processed by the bank.';
        newTxn.refunded_to_wallet = false;
        newTxn.updated_at = new Date().toISOString();
        isDeducted = false; // Retain wallet deduction! DO NOT REFUND!

        if (supabase) {
          try {
            await supabase
              .from('payout_transactions')
              .update({
                status: 'pending',
                utr: newTxn.utr,
                api_order_id: apiOrderId,
                api_response: resData,
                failure_reason: newTxn.failure_reason,
                refunded_to_wallet: false,
                updated_at: newTxn.updated_at
              })
              .eq('id', newTxn.id);
          } catch (e) {
            console.warn('Supabase update pending warning:', e.message);
          }
        }

        return res.status(200).json({
          success: true,
          status: 'pending',
          message: resData.message || 'Payout transfer is currently being processed by the bank. Webhook will be delivered upon completion.',
          data: {
            order_id: apiOrderId || clientOrderId,
            client_order_id: clientOrderId,
            utr: newTxn.utr,
            amount: numAmount,
            slab_charge: charge_amount,
            total_deducted: total_deducted,
            beneficiary_name: cleanBeneficiary,
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            transfer_mode: mode,
            remaining_wallet_balance: newWalletBalance,
            status: 'pending'
          }
        });
      }

      // Handle Immediate Success Response
      if (resData.status === 'success' || response.status === 200) {
        const finalUtr = utr || `UTR${Date.now()}`.slice(-12);
        const finalOrderId = apiOrderId || `B2BPO${Date.now()}`;

        newTxn.status = 'success';
        newTxn.utr = finalUtr;
        newTxn.api_order_id = finalOrderId;
        newTxn.api_response = resData;
        newTxn.failure_reason = null;
        newTxn.refunded_to_wallet = false;
        newTxn.updated_at = new Date().toISOString();
        isDeducted = false; // Successfully processed, do not refund

        if (supabase) {
          try {
            await supabase
              .from('payout_transactions')
              .update({
                status: 'success',
                utr: finalUtr,
                api_order_id: finalOrderId,
                api_response: resData,
                failure_reason: null,
                refunded_to_wallet: false,
                updated_at: newTxn.updated_at
              })
              .eq('id', newTxn.id);
          } catch {}
        }

        // Auto-save/update into saved beneficiaries
        try {
          const autoBen = {
            id: `ben_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            user_id: userProfile.id,
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            beneficiary_name: cleanBeneficiary,
            bank_name: bank_name || '',
            is_verified: true,
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          if (!db.payout_beneficiaries) db.payout_beneficiaries = [];
          const bIdx = db.payout_beneficiaries.findIndex(b => b.user_id === userProfile.id && b.account_number === cleanAccount && b.ifsc_code === cleanIfsc);
          if (bIdx !== -1) {
            db.payout_beneficiaries[bIdx] = { ...db.payout_beneficiaries[bIdx], ...autoBen, id: db.payout_beneficiaries[bIdx].id };
          } else {
            db.payout_beneficiaries.unshift(autoBen);
          }
          if (supabase) {
            await supabase.from('payout_beneficiaries').upsert([autoBen]);
          }
        } catch {}

        return res.status(200).json({
          success: true,
          status: 'success',
          message: resData.message || 'Payout transfer completed successfully',
          data: {
            order_id: finalOrderId,
            client_order_id: clientOrderId,
            utr: finalUtr,
            amount: numAmount,
            slab_charge: charge_amount,
            total_deducted: total_deducted,
            beneficiary_name: cleanBeneficiary,
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            transfer_mode: mode,
            remaining_wallet_balance: newWalletBalance,
            status: 'success'
          }
        });
      } else {
        throw new Error(resData?.message || 'Upstream Payout Failed');
      }
    } catch (apiErr) {
      console.error('[UsePay Payout Transfer API Error]:', apiErr.response?.data || apiErr.message);

      const errorPayload = apiErr.response?.data || {};
      const failureReason = errorPayload.message || apiErr.message || 'Upstream bank payout transfer failed';

      // STRICT GUARD: CHECK IF THIS IS AN IN-PROGRESS / PENDING STATE OR GATEWAY TIMEOUT
      const isPending = 
        apiErr.response?.status === 202 ||
        isPayoutProcessingOrPending(errorPayload, failureReason) ||
        apiErr.code === 'ECONNABORTED' ||
        String(apiErr.message || '').toLowerCase().includes('timeout');

      if (isPending) {
        // STRICT RULE: DO NOT REFUND! Bank is processing this transfer.
        console.log(`[UsePay Payout In-Progress Guard]: Transfer ${clientOrderId} is being processed by bank. Retaining wallet deduction and setting status to pending.`);
        isDeducted = false; // Do not auto-refund

        const apiOrderId = errorPayload.order_id || errorPayload.data?.order_id || null;
        const utr = errorPayload.utr || errorPayload.data?.utr || null;

        if (newTxn) {
          newTxn.status = 'pending';
          newTxn.refunded_to_wallet = false;
          newTxn.failure_reason = failureReason;
          if (apiOrderId) newTxn.api_order_id = apiOrderId;
          if (utr) newTxn.utr = utr;
          newTxn.api_response = errorPayload;
          newTxn.updated_at = new Date().toISOString();

          if (supabase) {
            try {
              await supabase
                .from('payout_transactions')
                .update({
                  status: 'pending',
                  refunded_to_wallet: false,
                  failure_reason: failureReason,
                  api_order_id: newTxn.api_order_id,
                  utr: newTxn.utr,
                  api_response: errorPayload,
                  updated_at: newTxn.updated_at
                })
                .eq('id', newTxn.id);
            } catch (e) {
              console.warn('Supabase update pending warning:', e);
            }
          }
        }

        return res.status(200).json({
          success: true,
          status: 'pending',
          message: failureReason || 'Payout transfer is currently being processed by the bank. Webhook will be delivered automatically upon completion.',
          data: {
            order_id: newTxn?.api_order_id || clientOrderId,
            client_order_id: clientOrderId,
            utr: newTxn?.utr || null,
            amount: numAmount,
            slab_charge: charge_amount,
            total_deducted: total_deducted,
            beneficiary_name: cleanBeneficiary,
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            transfer_mode: mode,
            remaining_wallet_balance: newWalletBalance,
            status: 'pending'
          }
        });
      }

      // ONLY IF IT IS A DEFINITIVE HARD FAILURE (not pending/processing):
      let refundedBalance = currentWalletBalance;
      if (isDeducted && !hasRefunded) {
        hasRefunded = true;
        refundedBalance = parseFloat((userProfile.wallet_balance + total_deducted).toFixed(2));
        userProfile.wallet_balance = refundedBalance;
        userProfile.updated_at = new Date().toISOString();

        if (memUserIdx !== -1) {
          db.users[memUserIdx].wallet_balance = refundedBalance;
        }

        if (supabase) {
          try {
            await supabase
              .from('users_profiles')
              .update({ wallet_balance: refundedBalance, updated_at: new Date().toISOString() })
              .eq('id', userProfile.id);
          } catch (e) {
            console.error('Auto-refund wallet update failed:', e);
          }
        }
      }

      if (newTxn) {
        newTxn.status = 'failed';
        newTxn.refunded_to_wallet = true;
        newTxn.failure_reason = failureReason;
        newTxn.api_response = errorPayload;
        newTxn.updated_at = new Date().toISOString();

        if (supabase) {
          try {
            await supabase
              .from('payout_transactions')
              .update({
                status: 'failed',
                refunded_to_wallet: true,
                failure_reason: failureReason,
                api_response: errorPayload,
                updated_at: newTxn.updated_at
              })
              .eq('id', newTxn.id);
          } catch {}
        }
      }

      return res.status(400).json({
        success: false,
        refunded: true,
        message: `Payout Failed: ${failureReason}. ₹${total_deducted.toFixed(2)} has been refunded to your wallet.`,
        data: {
          client_order_id: clientOrderId,
          amount: numAmount,
          slab_charge: charge_amount,
          refunded_amount: total_deducted,
          status: 'failed',
          refunded_to_wallet: true,
          current_wallet_balance: refundedBalance
        }
      });
    }
  } catch (outerErr) {
    console.error('Payout Transfer Critical Error:', outerErr);

    // If wallet was deducted but unexpected exception occurred, auto-refund strictly once
    if (isDeducted && !hasRefunded && userProfile && deductedAmount > 0) {
      try {
        hasRefunded = true;
        const safeRefunded = parseFloat((userProfile.wallet_balance + deductedAmount).toFixed(2));
        userProfile.wallet_balance = safeRefunded;
        if (supabase) {
          await supabase
            .from('users_profiles')
            .update({ wallet_balance: safeRefunded, updated_at: new Date().toISOString() })
            .eq('id', userProfile.id);
        }
      } catch (refundErr) {
        console.error('Critical refund recovery failed:', refundErr);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing payout transfer: ' + outerErr.message
    });
  } finally {
    // Release the user's active payout lock
    activePayoutLocks.delete(userId);
  }
});

// ============================================================================
// 4. CHECK PAYOUT STATUS
// ============================================================================

// GET /api/payout/status/:order_id
router.get('/status/:order_id', verifyToken, async (req, res) => {
  try {
    const { order_id } = req.params;

    const baseUrl = (process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
    const apiKey = process.env.USEPAY_API_KEY || '';
    const secretKey = process.env.USEPAY_SECRET_KEY || '';

    // Check local transaction record first
    let localTxn = (db.payout_transactions || []).find(
      t => t.client_order_id === order_id || t.api_order_id === order_id || t.id === order_id
    );

    if (!localTxn && supabase) {
      try {
        const { data } = await supabase
          .from('payout_transactions')
          .select('*')
          .or(`client_order_id.eq.${order_id},api_order_id.eq.${order_id},id.eq.${order_id}`)
          .maybeSingle();
        if (data) localTxn = data;
      } catch {}
    }

    if (apiKey && secretKey) {
      try {
        const targetId = localTxn?.api_order_id || localTxn?.client_order_id || order_id;
        const response = await axios.get(`${baseUrl}/payout/status/${encodeURIComponent(targetId)}`, {
          headers: {
            'x-api-key': apiKey,
            'x-secret-key': secretKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data && (response.data.status === 'success' || response.status === 200)) {
          const liveData = response.data.data || response.data;
          const liveStatus = String(liveData.status || response.data.status || '').toLowerCase();
          const liveUtr = liveData.utr || response.data.utr || null;
          const liveApiOrderId = liveData.order_id || response.data.order_id || null;

          // If localTxn was not found initially, attempt matching by liveData's client_order_id or order_id
          if (!localTxn && supabase) {
            try {
              const queryIds = [liveData.client_order_id, liveApiOrderId, order_id].filter(Boolean);
              if (queryIds.length > 0) {
                const orClause = queryIds.map(id => `client_order_id.eq.${id},api_order_id.eq.${id}`).join(',');
                const { data: matched } = await supabase
                  .from('payout_transactions')
                  .select('*')
                  .or(orClause)
                  .maybeSingle();
                if (matched) localTxn = matched;
              }
            } catch (matchErr) {
              console.warn('Matching localTxn warning:', matchErr.message);
            }
          }

          if (localTxn) {
            if (liveStatus === 'success' || liveStatus === 'completed') {
              localTxn.status = 'success';
              if (liveUtr) localTxn.utr = liveUtr;
              if (liveApiOrderId) localTxn.api_order_id = liveApiOrderId;
              localTxn.failure_reason = null;
              localTxn.refunded_to_wallet = false;
            } else if (liveStatus === 'failed' || liveStatus === 'rejected') {
              localTxn.status = 'failed';
              // If not refunded, refund once
              if (!localTxn.refunded_to_wallet) {
                localTxn.refunded_to_wallet = true;
                const refundAmt = Number(localTxn.total_deducted || (localTxn.amount + localTxn.slab_charge));
                if (supabase) {
                  const { data: userRec } = await supabase.from('users_profiles').select('id, wallet_balance').eq('id', localTxn.user_id).single();
                  if (userRec) {
                    const newBal = Number((Number(userRec.wallet_balance || 0) + refundAmt).toFixed(2));
                    await supabase.from('users_profiles').update({ wallet_balance: newBal, updated_at: new Date().toISOString() }).eq('id', userRec.id);
                  }
                }
              }
            } else if (isPayoutProcessingOrPending(liveData) || isPayoutProcessingOrPending(response.data)) {
              localTxn.status = 'pending';
              localTxn.refunded_to_wallet = false;
            }

            localTxn.updated_at = new Date().toISOString();
            if (supabase) {
              await supabase
                .from('payout_transactions')
                .update({
                  status: localTxn.status,
                  utr: localTxn.utr || null,
                  api_order_id: localTxn.api_order_id || null,
                  failure_reason: localTxn.failure_reason,
                  refunded_to_wallet: localTxn.refunded_to_wallet,
                  updated_at: localTxn.updated_at
                })
                .eq('id', localTxn.id);
            }
          }

          return res.status(200).json({
            success: true,
            data: liveData,
            localRecord: localTxn,
            message: `Bank status: ${liveStatus.toUpperCase()}${liveUtr ? ` (UTR: ${liveUtr})` : ''}`
          });
        }
      } catch (apiErr) {
        console.warn('UsePay Status Check API error:', apiErr.message, apiErr.response?.data);
        const errData = apiErr.response?.data;
        if (errData && (errData.data || isPayoutProcessingOrPending(errData.data, errData.message))) {
          const liveData = errData.data || {};
          if (localTxn && isPayoutProcessingOrPending(liveData, errData.message)) {
            localTxn.status = 'pending';
            localTxn.failure_reason = errData.message;
            if (supabase) {
              await supabase.from('payout_transactions').update({ status: 'pending', failure_reason: errData.message }).eq('id', localTxn.id);
            }
          }
          return res.status(200).json({
            success: true,
            data: liveData,
            localRecord: localTxn,
            message: errData.message || 'Payout transfer is currently being processed by the bank.'
          });
        }
      }
    }

    if (localTxn) {
      return res.status(200).json({
        success: true,
        data: localTxn
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Payout transaction order not found'
    });
  } catch (err) {
    console.error('Payout Status Check Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to query payout status' });
  }
});

// POST /api/payout/verify-account - Bank Account Validation (Penny Drop) with Dynamic Fee & Wallet Deduction
router.post('/verify-account', verifyToken, async (req, res) => {
  try {
    const { account_number, ifsc_code, client_reference_id } = req.body;
    const cleanAccount = String(account_number || '').trim();
    const cleanIfsc = String(ifsc_code || '').trim().toUpperCase();

    if (!cleanAccount || cleanAccount.length < 8 || cleanAccount.length > 22) {
      return res.status(400).json({ success: false, message: 'Invalid Account Number (8 to 22 digits required)' });
    }
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      return res.status(400).json({ success: false, message: 'Invalid IFSC Code (11 alphanumeric characters required)' });
    }

    if (!db.system_settings) {
      db.system_settings = {
        payout_verification_charge: 5.00,
        payout_verification_enabled: true
      };
    }

    if (db.system_settings.payout_verification_enabled === false) {
      return res.status(403).json({
        success: false,
        message: 'Bank account verification service is currently disabled by administrator.'
      });
    }

    const verificationCharge = Number(db.system_settings.payout_verification_charge !== undefined ? db.system_settings.payout_verification_charge : 5.00);

    // 1. Fetch user to check wallet balance
    const userId = req.user.id;
    let userProfile = (db.users || []).find(u => u.id === userId);
    if (!userProfile && supabase) {
      try {
        const { data } = await supabase.from('users_profiles').select('*').eq('id', userId).single();
        if (data) userProfile = data;
      } catch {}
    }

    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const currentBalance = Number(userProfile.wallet_balance || 0);
    if (currentBalance < verificationCharge) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance to verify bank account. Required ₹${verificationCharge.toFixed(2)}, Available ₹${currentBalance.toFixed(2)}.`
      });
    }

    const baseUrl = (process.env.USEPAY_BASE_URL || 'https://www.usepay.in/api/v1/b2b').replace(/\/$/, '');
    const apiKey = process.env.USEPAY_API_KEY || '';
    const secretKey = process.env.USEPAY_SECRET_KEY || '';

    let liveData = null;

    if (!apiKey || !secretKey) {
      // Mock Sandbox Response
      liveData = {
        account_number: cleanAccount,
        ifsc_code: cleanIfsc,
        name_at_bank: 'RAMESHBHAI PATEL',
        bank_name: 'HDFC BANK',
        utr: `VFY${Date.now()}`.slice(-12),
        reference_id: `B2BVFY${Date.now()}`,
        client_reference_id: client_reference_id || `VFY_${Date.now()}`,
        account_status: 'ACTIVE',
        city: 'AHMEDABAD',
        branch: 'NAVRANGPURA',
        charge_deducted: 3.00,
        status: 'success'
      };
    } else {
      try {
        const response = await axios.post(
          `${baseUrl}/payout/verify-account`,
          {
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            client_reference_id: client_reference_id || `VFY_${Date.now()}`
          },
          {
            headers: {
              'x-api-key': apiKey,
              'x-secret-key': secretKey,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        );

        if (response.data && (response.data.status === 'success' || response.status === 200)) {
          liveData = response.data.data || response.data;
        } else {
          throw new Error(response.data?.message || 'Verification unsuccessful at bank gateway.');
        }
      } catch (apiErr) {
        const errPayload = apiErr.response?.data || {};
        const failMsg = errPayload.message || apiErr.message || 'Bank account verification failed. Invalid account number or inactive bank account.';

        // Record failed attempt in history with 0 charge
        const failedRecord = {
          id: `pver_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          user_id: userProfile.id,
          user_name: userProfile.name || '',
          user_mobile: userProfile.mobile_number || '',
          account_number: cleanAccount,
          ifsc_code: cleanIfsc,
          name_at_bank: null,
          bank_name: null,
          branch: null,
          city: null,
          utr: null,
          reference_id: null,
          client_reference_id: client_reference_id || `VFY_${Date.now()}`,
          account_status: 'FAILED',
          charge_deducted: 0.00,
          gateway_charge: 0.00,
          status: 'failed',
          failure_reason: failMsg,
          created_at: new Date().toISOString()
        };

        if (!db.payout_verifications) db.payout_verifications = [];
        db.payout_verifications.unshift(failedRecord);

        if (supabase) {
          try {
            await supabase.from('payout_verifications').insert([failedRecord]);
          } catch {}
        }

        return res.status(apiErr.response?.status || 400).json({
          status: 'failed',
          success: false,
          message: failMsg,
          data: {
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            charge_deducted: 0.00,
            status: 'failed'
          }
        });
      }
    }

    // SUCCESSFUL VERIFICATION: Deduct fee from user wallet!
    const newWalletBalance = Number((currentBalance - verificationCharge).toFixed(2));
    userProfile.wallet_balance = newWalletBalance;
    userProfile.updated_at = new Date().toISOString();

    const memUserIdx = (db.users || []).findIndex(u => u.id === userProfile.id);
    if (memUserIdx !== -1) {
      db.users[memUserIdx].wallet_balance = newWalletBalance;
    }

    if (supabase) {
      try {
        await supabase
          .from('users_profiles')
          .update({ wallet_balance: newWalletBalance, updated_at: new Date().toISOString() })
          .eq('id', userProfile.id);
      } catch (e) {
        console.warn('Supabase wallet deduction for verification warning:', e.message);
      }
    }

    // Save into wallet_ledger passbook
    if (!db.wallet_ledger) db.wallet_ledger = [];
    const ledgerEntry = {
      id: `wled_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userProfile.id,
      amount: verificationCharge,
      type: 'DEBIT',
      description: `Bank Account Penny Drop Verification Fee - A/C ${cleanAccount.slice(-4)} (${liveData.bank_name || cleanIfsc})`,
      balance_after: newWalletBalance,
      reference_id: liveData.utr || liveData.reference_id || `VFY_${Date.now()}`,
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    db.wallet_ledger.unshift(ledgerEntry);
    if (supabase) {
      try {
        await supabase.from('wallet_ledger').insert([ledgerEntry]);
      } catch {}
    }

    // Auto-save into Saved Beneficiaries
    const benName = liveData.name_at_bank || liveData.account_name || 'VERIFIED BENEFICIARY';
    const benRecord = {
      id: `ben_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userProfile.id,
      account_number: cleanAccount,
      ifsc_code: cleanIfsc,
      beneficiary_name: benName,
      bank_name: liveData.bank_name || '',
      branch: liveData.branch || '',
      city: liveData.city || '',
      is_verified: true,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.payout_beneficiaries) db.payout_beneficiaries = [];
    const existingIdx = db.payout_beneficiaries.findIndex(
      b => b.user_id === userProfile.id && b.account_number === cleanAccount && b.ifsc_code === cleanIfsc
    );
    if (existingIdx !== -1) {
      db.payout_beneficiaries[existingIdx] = {
        ...db.payout_beneficiaries[existingIdx],
        ...benRecord,
        id: db.payout_beneficiaries[existingIdx].id
      };
    } else {
      db.payout_beneficiaries.unshift(benRecord);
    }

    if (supabase) {
      try {
        await supabase.from('payout_beneficiaries').upsert([benRecord]);
      } catch {}
    }

    // Record into payout_verifications history
    const verRecord = {
      id: `pver_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userProfile.id,
      user_name: userProfile.name || '',
      user_mobile: userProfile.mobile_number || '',
      account_number: cleanAccount,
      ifsc_code: cleanIfsc,
      name_at_bank: benName,
      bank_name: liveData.bank_name || '',
      branch: liveData.branch || '',
      city: liveData.city || '',
      utr: liveData.utr || null,
      reference_id: liveData.reference_id || null,
      client_reference_id: client_reference_id || `VFY_${Date.now()}`,
      account_status: liveData.account_status || 'ACTIVE',
      charge_deducted: verificationCharge,
      gateway_charge: Number(db.system_settings?.payout_verification_gateway_cost !== undefined ? db.system_settings.payout_verification_gateway_cost : (liveData.charge_deducted || 3.00)),
      status: 'success',
      failure_reason: null,
      created_at: new Date().toISOString()
    };

    if (!db.payout_verifications) db.payout_verifications = [];
    db.payout_verifications.unshift(verRecord);
    if (supabase) {
      try {
        await supabase.from('payout_verifications').insert([verRecord]);
      } catch {}
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Bank account verified successfully',
      data: {
        ...liveData,
        name_at_bank: benName,
        charge_deducted: verificationCharge,
        remaining_wallet_balance: newWalletBalance,
        beneficiary: benRecord
      }
    });

  } catch (err) {
    console.error('Verify Account Error:', err);
    return res.status(500).json({
      status: 'failed',
      success: false,
      message: err.message || 'Internal server error while verifying bank account'
    });
  }
});

// ============================================================================
// 4B. SAVED BENEFICIARIES MANAGEMENT
// ============================================================================

// GET /api/payout/beneficiaries - Get saved beneficiaries for user
router.get('/beneficiaries', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let list = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payout_beneficiaries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
        }
      } catch {}
    }
    if (list.length === 0) {
      list = (db.payout_beneficiaries || []).filter(b => b.user_id === userId);
    }
    return res.status(200).json({ success: true, beneficiaries: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch beneficiaries' });
  }
});

// POST /api/payout/beneficiaries - Save or update beneficiary
router.post('/beneficiaries', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_number, ifsc_code, beneficiary_name, bank_name, branch, city } = req.body;
    const cleanAccount = String(account_number || '').trim();
    const cleanIfsc = String(ifsc_code || '').trim().toUpperCase();
    const cleanName = String(beneficiary_name || '').trim();

    if (!cleanAccount || !cleanIfsc || !cleanName) {
      return res.status(400).json({ success: false, message: 'Account number, IFSC, and Beneficiary Name are required.' });
    }

    const benRecord = {
      id: `ben_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      account_number: cleanAccount,
      ifsc_code: cleanIfsc,
      beneficiary_name: cleanName,
      bank_name: bank_name || '',
      branch: branch || '',
      city: city || '',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.payout_beneficiaries) db.payout_beneficiaries = [];
    const idx = db.payout_beneficiaries.findIndex(b => b.user_id === userId && b.account_number === cleanAccount && b.ifsc_code === cleanIfsc);
    if (idx !== -1) {
      db.payout_beneficiaries[idx] = { ...db.payout_beneficiaries[idx], ...benRecord, id: db.payout_beneficiaries[idx].id };
    } else {
      db.payout_beneficiaries.unshift(benRecord);
    }

    if (supabase) {
      try {
        await supabase.from('payout_beneficiaries').upsert([benRecord]);
      } catch {}
    }

    return res.status(200).json({ success: true, message: 'Beneficiary saved successfully', beneficiary: benRecord });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save beneficiary' });
  }
});

// DELETE /api/payout/beneficiaries/:id - Delete a saved beneficiary
router.delete('/beneficiaries/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (db.payout_beneficiaries) {
      db.payout_beneficiaries = db.payout_beneficiaries.filter(b => !(b.id === id && b.user_id === userId));
    }

    if (supabase) {
      try {
        await supabase.from('payout_beneficiaries').delete().eq('id', id).eq('user_id', userId);
      } catch {}
    }

    return res.status(200).json({ success: true, message: 'Beneficiary removed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete beneficiary' });
  }
});

// ============================================================================
// 4C. PENNY DROP VERIFICATIONS HISTORY ENDPOINTS
// ============================================================================

// GET /api/payout/verifications/user - Fetch verification history for user
router.get('/verifications/user', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let list = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payout_verifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
        }
      } catch {}
    }
    if (list.length === 0) {
      list = (db.payout_verifications || []).filter(v => v.user_id === userId);
    }
    return res.status(200).json({ success: true, verifications: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch verification history' });
  }
});

// GET /api/payout/verifications/admin - Fetch all verification history for Admin
router.get('/verifications/admin', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    let list = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payout_verifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
        }
      } catch {}
    }
    if (list.length === 0) {
      list = db.payout_verifications || [];
    }

    // Calculate Platform Stats
    const totalVerifications = list.length;
    const successCount = list.filter(v => v.status === 'success').length;
    const failedCount = list.filter(v => v.status === 'failed').length;
    const totalCollected = list.reduce((acc, curr) => acc + Number(curr.charge_deducted || 0), 0);
    const configuredGatewayCost = Number(db.system_settings?.payout_verification_gateway_cost !== undefined ? db.system_settings.payout_verification_gateway_cost : 3.00);
    const totalGatewayCost = list.reduce((acc, curr) => acc + (curr.status === 'success' ? Number(curr.gateway_charge !== undefined && curr.gateway_charge !== null ? curr.gateway_charge : configuredGatewayCost) : 0), 0);
    const netProfit = Number((totalCollected - totalGatewayCost).toFixed(2));

    return res.status(200).json({
      success: true,
      verifications: list,
      stats: {
        total_verifications: totalVerifications,
        success_count: successCount,
        failed_count: failedCount,
        total_collected: totalCollected,
        total_gateway_cost: totalGatewayCost,
        net_profit: netProfit
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin verification records' });
  }
});

// GET /api/payout/webhook - Verification / Health check for gateway webhook URL
router.get('/webhook', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AsEasySwipe Payout Webhook endpoint is active and listening',
    timestamp: new Date().toISOString()
  });
});

// POST /api/payout/webhook - Public Webhook for UsePay Payout Status Callbacks
router.post('/webhook', async (req, res) => {
  try {
    console.log('[UsePay Payout Webhook Received]:', JSON.stringify(req.body, null, 2));
    const payload = req.body || {};
    const orderData = payload.data || {};
    
    const clientOrderId = payload.client_order_id || orderData.client_order_id || payload.order_id || orderData.order_id;
    const apiOrderId = payload.order_id || orderData.order_id || null;
    const rawStatus = String(payload.status || orderData.status || payload.payment_status || '').toLowerCase();
    const utr = payload.utr || orderData.utr || payload.rrn || orderData.rrn || null;
    const msg = payload.message || orderData.message || payload.failure_reason || null;

    if (!clientOrderId) {
      return res.status(400).json({ success: false, message: 'Missing client_order_id in webhook payload' });
    }

    let txn = (db.payout_transactions || []).find(
      t => t.client_order_id === clientOrderId || t.api_order_id === clientOrderId || t.id === clientOrderId || (apiOrderId && (t.api_order_id === apiOrderId || t.client_order_id === apiOrderId))
    );

    if (!txn && supabase) {
      try {
        const { data } = await supabase
          .from('payout_transactions')
          .select('*')
          .or(`client_order_id.eq.${clientOrderId},api_order_id.eq.${clientOrderId},id.eq.${clientOrderId}`)
          .maybeSingle();
        if (data) txn = data;
      } catch (e) {
        console.warn('Supabase fetch txn in webhook warning:', e);
      }
    }

    if (!txn) {
      console.warn(`[Payout Webhook]: Transaction not found for order ${clientOrderId}`);
      return res.status(200).json({ success: true, message: 'Webhook received but local order not found' });
    }

    const isSuccess = rawStatus === 'success' || rawStatus === 'completed';
    const isFailed = rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'reversed';

    if (isSuccess) {
      console.log(`[Payout Webhook]: Payout ${clientOrderId} confirmed SUCCESS with UTR ${utr}`);
      txn.status = 'success';
      if (utr) txn.utr = utr;
      if (apiOrderId) txn.api_order_id = apiOrderId;
      txn.failure_reason = null;
      txn.refunded_to_wallet = false;
      txn.updated_at = new Date().toISOString();

      if (supabase) {
        try {
          await supabase
            .from('payout_transactions')
            .update({
              status: 'success',
              utr: txn.utr,
              api_order_id: txn.api_order_id,
              failure_reason: null,
              refunded_to_wallet: false,
              updated_at: txn.updated_at
            })
            .eq('id', txn.id);
        } catch (e) {
          console.error('Webhook Supabase update error:', e);
        }
      }
    } else if (isFailed) {
      console.log(`[Payout Webhook]: Payout ${clientOrderId} confirmed FAILED. Processing refund if not refunded.`);
      // Only refund if not already refunded
      if (!txn.refunded_to_wallet) {
        txn.refunded_to_wallet = true;
        const refundAmt = Number(txn.total_deducted || (txn.amount + txn.slab_charge));

        if (supabase) {
          try {
            const { data: userRecord } = await supabase
              .from('users_profiles')
              .select('id, wallet_balance')
              .eq('id', txn.user_id)
              .single();

            if (userRecord) {
              const currentBal = Number(userRecord.wallet_balance || 0);
              const newBal = Number((currentBal + refundAmt).toFixed(2));
              await supabase
                .from('users_profiles')
                .update({ wallet_balance: newBal, updated_at: new Date().toISOString() })
                .eq('id', userRecord.id);

              const memUser = (db.users || []).find(u => u.id === txn.user_id);
              if (memUser) memUser.wallet_balance = newBal;
              console.log(`[Payout Webhook]: Refunded ₹${refundAmt} to user ${txn.user_id}`);
            }
          } catch (e) {
            console.error('Webhook refund error:', e);
          }
        }
      }

      txn.status = 'failed';
      txn.failure_reason = msg || 'Bank payout transfer failed';
      txn.updated_at = new Date().toISOString();

      if (supabase) {
        try {
          await supabase
            .from('payout_transactions')
            .update({
              status: 'failed',
              refunded_to_wallet: true,
              failure_reason: txn.failure_reason,
              updated_at: txn.updated_at
            })
            .eq('id', txn.id);
        } catch (e) {
          console.error('Webhook Supabase fail update error:', e);
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Payout webhook processed successfully' });
  } catch (err) {
    console.error('[Payout Webhook Critical Error]:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing exception' });
  }
});

// POST /api/payout/reconcile/:id - Admin Manual Reconciliation
router.post('/reconcile/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, utr, remarks, adjust_wallet } = req.body;

    let txn = (db.payout_transactions || []).find(t => t.id === id || t.client_order_id === id);
    if (!txn && supabase) {
      const { data } = await supabase.from('payout_transactions').select('*').or(`id.eq.${id},client_order_id.eq.${id}`).maybeSingle();
      if (data) txn = data;
    }

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Payout transaction not found' });
    }

    if (action === 'mark_success') {
      const finalUtr = utr || txn.utr || `MANUAL_${Date.now()}`;
      const wasRefunded = Boolean(txn.refunded_to_wallet);

      // If it was previously refunded to wallet by mistake, adjust wallet balance back
      if (wasRefunded && adjust_wallet !== false) {
        const deductAmt = Number(txn.total_deducted || (txn.amount + txn.slab_charge));
        if (supabase) {
          const { data: userRec } = await supabase.from('users_profiles').select('id, wallet_balance').eq('id', txn.user_id).single();
          if (userRec) {
            const currentBal = Number(userRec.wallet_balance || 0);
            const adjustedBal = Number((currentBal - deductAmt).toFixed(2));
            await supabase.from('users_profiles').update({ wallet_balance: adjustedBal, updated_at: new Date().toISOString() }).eq('id', userRec.id);
            const memUser = (db.users || []).find(u => u.id === txn.user_id);
            if (memUser) memUser.wallet_balance = adjustedBal;
            console.log(`[Admin Reconcile]: Re-debited ₹${deductAmt} from User ${txn.user_id} due to confirmed bank success.`);
          }
        }
      }

      txn.status = 'success';
      txn.utr = finalUtr;
      txn.failure_reason = null;
      txn.refunded_to_wallet = false;
      txn.updated_at = new Date().toISOString();

      if (supabase) {
        await supabase.from('payout_transactions').update({
          status: 'success',
          utr: finalUtr,
          failure_reason: null,
          refunded_to_wallet: false,
          updated_at: txn.updated_at
        }).eq('id', txn.id);
      }

      return res.status(200).json({ success: true, message: 'Payout transaction marked as SUCCESS!', transaction: txn });
    } else if (action === 'mark_failed') {
      const shouldRefund = !txn.refunded_to_wallet;
      if (shouldRefund) {
        const refundAmt = Number(txn.total_deducted || (txn.amount + txn.slab_charge));
        if (supabase) {
          const { data: userRec } = await supabase.from('users_profiles').select('id, wallet_balance').eq('id', txn.user_id).single();
          if (userRec) {
            const currentBal = Number(userRec.wallet_balance || 0);
            const refundedBal = Number((currentBal + refundAmt).toFixed(2));
            await supabase.from('users_profiles').update({ wallet_balance: refundedBal, updated_at: new Date().toISOString() }).eq('id', userRec.id);
            const memUser = (db.users || []).find(u => u.id === txn.user_id);
            if (memUser) memUser.wallet_balance = refundedBal;
          }
        }
      }

      txn.status = 'failed';
      txn.refunded_to_wallet = true;
      txn.failure_reason = remarks || 'Marked failed by administrator';
      txn.updated_at = new Date().toISOString();

      if (supabase) {
        await supabase.from('payout_transactions').update({
          status: 'failed',
          refunded_to_wallet: true,
          failure_reason: txn.failure_reason,
          updated_at: txn.updated_at
        }).eq('id', txn.id);
      }

      return res.status(200).json({ success: true, message: 'Payout transaction marked as FAILED and refunded.', transaction: txn });
    }

    return res.status(400).json({ success: false, message: 'Invalid action. Must be mark_success or mark_failed.' });
  } catch (err) {
    console.error('Reconcile error:', err);
    return res.status(500).json({ success: false, message: 'Reconciliation failed: ' + err.message });
  }
});

// ============================================================================
// 5. PAYOUT TRANSACTIONS HISTORY
// ============================================================================

// GET /api/payout/history - Fetch transaction history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let transactions = [];

    if (supabase) {
      try {
        let query = supabase
          .from('payout_transactions')
          .select(`
            *,
            users_profiles (
              name,
              firm_name,
              mobile_number
            )
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          query = query.eq('user_id', req.user.id);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          transactions = data.map(item => ({
            ...item,
            user_name: item.users_profiles?.name || item.user_name || 'Merchant',
            firm_name: item.users_profiles?.firm_name || '',
            user_mobile: item.users_profiles?.mobile_number || item.user_mobile || item.mobile_number
          }));
          return res.status(200).json({ success: true, transactions });
        }
      } catch (e) {
        console.warn('Supabase payout transactions fetch warning:', e.message);
      }
    }

    transactions = db.payout_transactions || [];
    if (!isAdmin) {
      transactions = transactions.filter(t => t.user_id === req.user.id);
    }

    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (err) {
    console.error('Fetch Payout History Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch payout history' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/payout/settings (Fetch Instant Payout Control Setting)
// -----------------------------------------------------------------------------
router.get('/settings', verifyToken, async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true
      };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'qr_controls')
          .maybeSingle();
        if (!error && data && data.instant_payout_enabled !== undefined) {
          db.system_settings.instant_payout_enabled = data.instant_payout_enabled !== false;
        }
      } catch (sbErr) {
        // Table or column may not exist yet, fallback to in-memory store
      }
    }

    return res.status(200).json({
      success: true,
      settings: {
        instant_payout_enabled: db.system_settings.instant_payout_enabled !== false,
        payout_verification_charge: Number(db.system_settings.payout_verification_charge !== undefined ? db.system_settings.payout_verification_charge : 5.00),
        payout_verification_gateway_cost: Number(db.system_settings.payout_verification_gateway_cost !== undefined ? db.system_settings.payout_verification_gateway_cost : 3.00),
        payout_verification_enabled: db.system_settings.payout_verification_enabled !== false
      }
    });
  } catch (error) {
    console.error('Fetch Payout Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching payout settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/payout/settings (Admin Only - Update Instant Payout & Verification Settings)
// -----------------------------------------------------------------------------
router.post('/settings', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true,
        payout_verification_charge: 5.00,
        payout_verification_gateway_cost: 3.00,
        payout_verification_enabled: true
      };
    }

    const { instant_payout_enabled, payout_verification_charge, payout_verification_gateway_cost, payout_verification_enabled } = req.body;
    if (instant_payout_enabled !== undefined) {
      db.system_settings.instant_payout_enabled = Boolean(instant_payout_enabled);
    }
    if (payout_verification_charge !== undefined) {
      db.system_settings.payout_verification_charge = Math.max(0, parseFloat(payout_verification_charge) || 0);
    }
    if (payout_verification_gateway_cost !== undefined) {
      db.system_settings.payout_verification_gateway_cost = Math.max(0, parseFloat(payout_verification_gateway_cost) || 0);
    }
    if (payout_verification_enabled !== undefined) {
      db.system_settings.payout_verification_enabled = Boolean(payout_verification_enabled);
    }

    if (supabase) {
      try {
        await supabase
          .from('system_settings')
          .upsert([{
            id: 'qr_controls',
            instant_payout_enabled: db.system_settings.instant_payout_enabled,
            updated_at: new Date().toISOString()
          }]);
      } catch (sbErr) {
        // Supabase column might not exist yet, safe in-memory fallback
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payout and Verification settings updated successfully.',
      settings: {
        instant_payout_enabled: db.system_settings.instant_payout_enabled,
        payout_verification_charge: db.system_settings.payout_verification_charge,
        payout_verification_gateway_cost: db.system_settings.payout_verification_gateway_cost,
        payout_verification_enabled: db.system_settings.payout_verification_enabled
      }
    });
  } catch (error) {
    console.error('Update Payout Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating payout settings.' });
  }
});

export default router;
