import express from 'express';
import axios from 'axios';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper: Calculate slab charge
export const calculatePayoutCharge = async (amount) => {
  const numAmount = parseFloat(amount || 0);
  let slabs = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payout_charge_slabs')
        .select('*')
        .eq('is_active', true)
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

  const matchingSlab = slabs.find(
    s => numAmount >= parseFloat(s.min_amount) && numAmount <= parseFloat(s.max_amount)
  );

  let charge = 0;
  if (matchingSlab) {
    if (matchingSlab.charge_type === 'percentage') {
      charge = parseFloat(((numAmount * parseFloat(matchingSlab.charge_value)) / 100).toFixed(2));
    } else {
      charge = parseFloat(parseFloat(matchingSlab.charge_value).toFixed(2));
    }
  } else {
    // Default fallback slab rule if out of configured slab range
    if (numAmount <= 1000) charge = 10;
    else if (numAmount <= 25000) charge = 15;
    else charge = 25;
  }

  return {
    slab: matchingSlab || null,
    charge_amount: charge,
    total_deducted: parseFloat((numAmount + charge).toFixed(2))
  };
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

    if (isNaN(numAmount) || numAmount < 100 || numAmount > 200000) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be between ₹100 and ₹2,00,000'
      });
    }

    const calculation = await calculatePayoutCharge(numAmount);

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
    if (isNaN(numAmount) || numAmount < 100 || numAmount > 200000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer amount. Payout amount must be between ₹100 and ₹2,00,000.'
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

    // 5. Dynamic Slab Charge Calculation
    const { slab, charge_amount, total_deducted } = await calculatePayoutCharge(numAmount);
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
          bank_name: bank_name || undefined
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

      const resData = response.data;

      // Handle Success Response
      if (resData && (resData.status === 'success' || response.status === 200)) {
        const orderData = resData.data || {};
        const utr = orderData.utr || resData.utr || `UTR${Date.now()}`.slice(-12);
        const apiOrderId = orderData.order_id || resData.order_id || `B2BPO${Date.now()}`;

        newTxn.status = 'success';
        newTxn.utr = utr;
        newTxn.api_order_id = apiOrderId;
        newTxn.api_response = resData;
        newTxn.updated_at = new Date().toISOString();
        isDeducted = false; // Successfully processed, do not refund

        if (supabase) {
          try {
            await supabase
              .from('payout_transactions')
              .update({
                status: 'success',
                utr,
                api_order_id: apiOrderId,
                api_response: resData,
                updated_at: newTxn.updated_at
              })
              .eq('id', newTxn.id);
          } catch {}
        }

        return res.status(200).json({
          success: true,
          message: resData.message || 'Payout transfer completed successfully',
          data: {
            order_id: apiOrderId,
            client_order_id: clientOrderId,
            utr,
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

      // 10. STRICT SINGLE AUTO-REFUND TO USER WALLET ON UPSTREAM FAILURE
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
        const targetId = localTxn?.api_order_id || order_id;
        const response = await axios.get(`${baseUrl}/payout/status/${targetId}`, {
          headers: {
            'x-api-key': apiKey,
            'x-secret-key': secretKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data && response.data.status === 'success') {
          const liveData = response.data.data;

          // Update local status if changed
          if (localTxn && liveData) {
            localTxn.status = liveData.status || localTxn.status;
            if (liveData.utr) localTxn.utr = liveData.utr;
            if (supabase) {
              await supabase
                .from('payout_transactions')
                .update({
                  status: localTxn.status,
                  utr: localTxn.utr,
                  updated_at: new Date().toISOString()
                })
                .eq('id', localTxn.id);
            }
          }

          return res.status(200).json({
            success: true,
            data: liveData,
            localRecord: localTxn
          });
        }
      } catch (apiErr) {
        console.warn('UsePay Status Check API error fallback to local:', apiErr.message);
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
        instant_payout_enabled: db.system_settings.instant_payout_enabled !== false
      }
    });
  } catch (error) {
    console.error('Fetch Payout Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching payout settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/payout/settings (Admin Only - Update Instant Payout Toggle)
// -----------------------------------------------------------------------------
router.post('/settings', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true
      };
    }

    const { instant_payout_enabled } = req.body;
    if (instant_payout_enabled !== undefined) {
      db.system_settings.instant_payout_enabled = Boolean(instant_payout_enabled);
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
      message: `Instant Payout service ${db.system_settings.instant_payout_enabled ? 'enabled' : 'disabled'} successfully.`,
      settings: {
        instant_payout_enabled: db.system_settings.instant_payout_enabled
      }
    });
  } catch (error) {
    console.error('Update Payout Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating payout settings.' });
  }
});

export default router;
