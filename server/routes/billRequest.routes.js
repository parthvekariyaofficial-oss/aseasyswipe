import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate service charge from slabs
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

  // Fallback rule if above max slab
  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  return 100;
};

// =============================================================================
// CHARGE SLABS MANAGEMENT ENDPOINTS (Admin & Public Read)
// =============================================================================

// GET /api/bill-request/slabs - Fetch all slabs
router.get('/slabs', verifyToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('bill_charge_slabs').select('*').order('min_amount', { ascending: true });
      if (!error && data) {
        db.charge_slabs = data;
        return res.status(200).json({ success: true, slabs: data });
      }
    }

    return res.status(200).json({
      success: true,
      slabs: db.charge_slabs || []
    });
  } catch (err) {
    console.error('Fetch Slabs Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch charge slabs' });
  }
});

// POST /api/bill-request/slabs - Create slab (Admin)
router.post('/slabs', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { min_amount, max_amount, charge_amount } = req.body;

    if (min_amount === undefined || max_amount === undefined || charge_amount === undefined) {
      return res.status(400).json({ success: false, message: 'min_amount, max_amount and charge_amount are required' });
    }

    const newSlab = {
      id: `slab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      min_amount: Number(min_amount),
      max_amount: Number(max_amount),
      charge_amount: Number(charge_amount),
      created_at: new Date().toISOString()
    };

    if (!db.charge_slabs) db.charge_slabs = [];
    db.charge_slabs.push(newSlab);

    if (supabase) {
      try {
        await supabase.from('bill_charge_slabs').insert([newSlab]);
      } catch (e) {
        console.warn('Supabase slab insert warning:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Service charge slab created successfully!',
      slab: newSlab
    });
  } catch (err) {
    console.error('Create Slab Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create charge slab' });
  }
});

// DELETE /api/bill-request/slabs/:id - Delete slab (Admin)
router.delete('/slabs/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    db.charge_slabs = (db.charge_slabs || []).filter(s => s.id !== id);

    if (supabase) {
      try {
        await supabase.from('bill_charge_slabs').delete().eq('id', id);
      } catch (e) {
        // Silent catch
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Charge slab deleted successfully!'
    });
  } catch (err) {
    console.error('Delete Slab Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete charge slab' });
  }
});

// =============================================================================
// BILL PAYMENT REQUESTS ENDPOINTS (Submit, List, Process)
// =============================================================================

// POST /api/bill-request/submit - Submit Bill Payment Request (User)
router.post('/submit', verifyToken, async (req, res) => {
  // Check if CC Bill Pay is disabled by admin
  if (req.user?.role !== 'admin' && db.system_settings && db.system_settings.cc_bill_pay_enabled === false) {
    return res.status(403).json({
      success: false,
      message: 'Credit Card Bill Payment service is currently disabled by administrator.'
    });
  }

  try {
    const { customer_name, card_number, bank_name, amount, mobile_number } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer Name is required' });
    }

    const cleanCard = (card_number || '').replace(/\s+/g, '');
    if (!cleanCard || cleanCard.length !== 16 || !/^\d{16}$/.test(cleanCard)) {
      return res.status(400).json({ success: false, message: 'Card Number must be exactly 16 digits' });
    }

    if (!bank_name || !bank_name.trim()) {
      return res.status(400).json({ success: false, message: 'Bank Name is required' });
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount greater than ₹0 is required' });
    }

    const cleanMobile = (mobile_number || '').trim();
    if (!cleanMobile || cleanMobile.length !== 10 || !/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    // Calculate service charge according to dynamic slabs
    const serviceCharge = await calculateServiceCharge(numAmount);
    const totalDeduction = numAmount + serviceCharge;

    // Check user wallet balance
    let currentUser = db.users.find(u => u.id === req.user.id);
    if (supabase) {
      const { data } = await supabase.from('users_profiles').select('*').eq('id', req.user.id).maybeSingle();
      if (data) currentUser = data;
    }

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const currentBalance = Number(currentUser.wallet_balance || 0);
    if (currentBalance < totalDeduction) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Wallet Balance! Required: ₹${totalDeduction.toLocaleString('en-IN')} (Amount: ₹${numAmount} + Charge: ₹${serviceCharge}), Available: ₹${currentBalance.toLocaleString('en-IN')}`
      });
    }

    // Deduct amount from user wallet
    const newWalletBalance = currentBalance - totalDeduction;
    currentUser.wallet_balance = newWalletBalance;
    currentUser.updated_at = new Date().toISOString();

    const memUserIdx = db.users.findIndex(u => u.id === req.user.id);
    if (memUserIdx !== -1) db.users[memUserIdx].wallet_balance = newWalletBalance;

    if (supabase) {
      try {
        await supabase
          .from('users_profiles')
          .update({ wallet_balance: newWalletBalance, updated_at: new Date().toISOString() })
          .eq('id', req.user.id);
      } catch (e) {
        console.warn('Supabase wallet deduction warning:', e.message);
      }
    }

    // Create Credit Card Bill Request record
    const newRequest = {
      id: `ccreq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: req.user.id,
      user_name: req.user.name,
      user_mobile: req.user.mobile_number,
      customer_name: customer_name.trim(),
      card_number: cleanCard,
      bank_name: bank_name.trim(),
      amount: numAmount,
      service_charge: serviceCharge,
      total_amount: totalDeduction,
      mobile_number: cleanMobile,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    if (!db.bill_requests) db.bill_requests = [];
    db.bill_requests.unshift(newRequest);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('credit_card_bill_requests')
          .insert([{
            id: newRequest.id,
            user_id: newRequest.user_id,
            customer_name: newRequest.customer_name,
            card_number: newRequest.card_number,
            bank_name: newRequest.bank_name,
            amount: newRequest.amount,
            service_charge: newRequest.service_charge,
            total_amount: newRequest.total_amount,
            mobile_number: newRequest.mobile_number,
            status: 'pending',
            created_at: newRequest.created_at
          }])
          .select('*')
          .single();

        if (error) {
          console.warn('Supabase bill request create warning:', error.message);
        } else if (data) {
          const idx = db.bill_requests.findIndex(r => r.id === newRequest.id);
          if (idx !== -1) db.bill_requests[idx] = { ...data, user_name: req.user.name, user_mobile: req.user.mobile_number };
        }
      } catch (e) {
        console.warn('Supabase insert exception:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bill Payment Request submitted successfully! ₹${totalDeduction.toLocaleString('en-IN')} debited from main wallet.`,
      request: newRequest,
      new_wallet_balance: newWalletBalance
    });
  } catch (err) {
    console.error('Submit Bill Request Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit bill request' });
  }
});

// GET /api/bill-request/list - Fetch Bill Payment Requests
router.get('/list', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let requestsList = [];

    if (supabase) {
      try {
        let query = supabase.from('credit_card_bill_requests').select('*').order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('user_id', req.user.id);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          requestsList = data;
          db.bill_requests = requestsList;
        }
      } catch (e) {
        requestsList = db.bill_requests || [];
      }
    } else {
      requestsList = db.bill_requests || [];
    }

    // Filter by user role if using fallback list
    if (!isAdmin) {
      requestsList = requestsList.filter(r => r.user_id === req.user.id);
    }

    // Enrich with user name & mobile if missing
    requestsList = requestsList.map(r => {
      const u = (db.users || []).find(usr => usr.id === r.user_id);
      return {
        ...r,
        user_name: r.user_name || u?.name || 'Retailer',
        user_mobile: r.user_mobile || u?.mobile_number || r.mobile_number
      };
    });

    return res.status(200).json({
      success: true,
      requests: requestsList
    });
  } catch (err) {
    console.error('Fetch Bill Requests Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bill requests' });
  }
});

// POST /api/bill-request/:id/process - Process (Approve / Reject) Request (Admin)
router.post('/:id/process', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approved' or 'rejected'" });
    }

    let reqIndex = (db.bill_requests || []).findIndex(r => r.id === id);
    let targetRequest = reqIndex !== -1 ? db.bill_requests[reqIndex] : null;

    if (supabase) {
      const { data } = await supabase.from('credit_card_bill_requests').select('*').eq('id', id).maybeSingle();
      if (data) targetRequest = data;
    }

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'Bill payment request not found' });
    }

    if (targetRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${targetRequest.status}` });
    }

    const processedAt = new Date().toISOString();
    const updatePayload = {
      status: action,
      processed_at: processedAt,
      processed_by: req.user.id,
      ...(action === 'rejected' && { rejection_reason: (rejection_reason || 'Rejected by Admin').trim() })
    };

    // Update request status in memory
    if (reqIndex !== -1) {
      db.bill_requests[reqIndex] = {
        ...db.bill_requests[reqIndex],
        ...updatePayload
      };
    }

    if (supabase) {
      try {
        await supabase
          .from('credit_card_bill_requests')
          .update(updatePayload)
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase update status warning:', e.message);
      }
    }

    // IF REJECTED: INSTANT REFUND BACK TO USER WALLET!
    let refundAmount = 0;
    if (action === 'rejected') {
      refundAmount = Number(targetRequest.total_amount || targetRequest.amount);

      let targetUser = db.users.find(u => u.id === targetRequest.user_id);
      if (supabase) {
        const { data } = await supabase.from('users_profiles').select('*').eq('id', targetRequest.user_id).maybeSingle();
        if (data) targetUser = data;
      }

      if (targetUser) {
        const currentBal = Number(targetUser.wallet_balance || 0);
        const refundedBalance = currentBal + refundAmount;

        targetUser.wallet_balance = refundedBalance;
        targetUser.updated_at = new Date().toISOString();

        const memIdx = db.users.findIndex(u => u.id === targetRequest.user_id);
        if (memIdx !== -1) db.users[memIdx].wallet_balance = refundedBalance;

        if (supabase) {
          try {
            await supabase
              .from('users_profiles')
              .update({ wallet_balance: refundedBalance, updated_at: new Date().toISOString() })
              .eq('id', targetRequest.user_id);
          } catch (e) {
            console.warn('Supabase refund update warning:', e.message);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: action === 'approved'
        ? 'Bill Payment Request APPROVED successfully!'
        : `Bill Payment Request REJECTED! ₹${refundAmount.toLocaleString('en-IN')} refunded back to user wallet.`,
      request: {
        ...targetRequest,
        ...updatePayload
      }
    });
  } catch (err) {
    console.error('Process Bill Request Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process bill request' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/bill-request/settings (Fetch CC Bill Pay Control Setting)
// -----------------------------------------------------------------------------
router.get('/settings', verifyToken, async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true,
        cc_bill_pay_enabled: true
      };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'qr_controls')
          .maybeSingle();
        if (!error && data && data.cc_bill_pay_enabled !== undefined) {
          db.system_settings.cc_bill_pay_enabled = data.cc_bill_pay_enabled !== false;
        }
      } catch (sbErr) {
        // Table or column may not exist yet, fallback to in-memory store
      }
    }

    return res.status(200).json({
      success: true,
      settings: {
        cc_bill_pay_enabled: db.system_settings.cc_bill_pay_enabled !== false
      }
    });
  } catch (error) {
    console.error('Fetch CC Bill Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching CC bill settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/bill-request/settings (Admin Only - Update CC Bill Pay Toggle)
// -----------------------------------------------------------------------------
router.post('/settings', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true,
        cc_bill_pay_enabled: true
      };
    }

    const { cc_bill_pay_enabled } = req.body;
    if (cc_bill_pay_enabled !== undefined) {
      db.system_settings.cc_bill_pay_enabled = Boolean(cc_bill_pay_enabled);
    }

    if (supabase) {
      try {
        await supabase
          .from('system_settings')
          .upsert([{
            id: 'qr_controls',
            cc_bill_pay_enabled: db.system_settings.cc_bill_pay_enabled,
            updated_at: new Date().toISOString()
          }]);
      } catch (sbErr) {
        // Safe in-memory fallback
      }
    }

    return res.status(200).json({
      success: true,
      message: `Credit Card Bill Payment service ${db.system_settings.cc_bill_pay_enabled ? 'enabled' : 'disabled'} successfully.`,
      settings: {
        cc_bill_pay_enabled: db.system_settings.cc_bill_pay_enabled
      }
    });
  } catch (error) {
    console.error('Update CC Bill Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error updating CC bill settings.' });
  }
});

export default router;
