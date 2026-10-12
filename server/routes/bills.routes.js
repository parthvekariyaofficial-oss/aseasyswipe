import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken as authenticateToken } from '../middleware/auth.js';
import { processCommissionDistribution } from './commission.routes.js';

const router = express.Router();

// Helper to sanitize UUIDs
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// 1. Submit Offline Bill (Retailer) - Atomic Wallet Deduction
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const {
      service_type, provider, consumer_number, customer_name, customer_mobile,
      amount, charges, bill_proof_url
    } = req.body;

    if (!service_type || !provider || !consumer_number || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission parameters. Service, Provider, Consumer Number, and Amount are required.'
      });
    }

    const billAmount = parseFloat(amount);
    const billCharges = parseFloat(charges || 0);
    const totalDebited = billAmount + billCharges;

    // Check if connected to Supabase RPC
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_offline_bill', {
          p_user_id: req.user.id,
          p_service_type: service_type,
          p_provider: provider,
          p_consumer_number: consumer_number,
          p_customer_name: customer_name || req.user.name,
          p_customer_mobile: customer_mobile || req.user.mobile_number,
          p_amount: billAmount,
          p_charges: billCharges,
          p_bill_proof_url: bill_proof_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
        });

        if (!error && data && data.success) {
          return res.json(data);
        }
      } catch (e) {
        console.warn('Supabase RPC error fallback to mockStore:', e.message);
      }
    }

    // Fallback: Atomic MockStore Update
    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = db.users[userIndex];
    if ((user.wallet_balance || 0) < totalDebited) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ₹${totalDebited.toFixed(2)}, Available: ₹${(user.wallet_balance || 0).toFixed(2)}`
      });
    }

    const openBal = user.wallet_balance;
    const closeBal = openBal - totalDebited;

    // 1. Deduct wallet balance
    db.users[userIndex].wallet_balance = closeBal;

    // 2. Create Bill Record
    const billId = `bill_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newBill = {
      id: billId,
      user_id: req.user.id,
      user_name: user.name,
      firm_name: user.firm_name,
      mobile_number: user.mobile_number,
      service_type,
      provider,
      consumer_number,
      customer_name: customer_name || user.name,
      customer_mobile: customer_mobile || user.mobile_number,
      amount: billAmount,
      charges: billCharges,
      total_debited: totalDebited,
      bill_proof_url: bill_proof_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      receipt_proof_url: null,
      status: 'pending',
      claimed_by: null,
      operator_ref: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      actioned_at: null
    };

    db.bill_submissions.unshift(newBill);

    // 3. Add Transaction Ledger Entry
    db.wallet_transactions.unshift({
      id: `wt_${Date.now()}`,
      user_id: req.user.id,
      amount: totalDebited,
      type: 'debit',
      category: 'Offline Bill Hold',
      reference_id: billId,
      opening_balance: openBal,
      closing_balance: closeBal,
      description: `Offline Bill Payment Hold for ${service_type} (${provider}) Account: ${consumer_number}`,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Bill submitted successfully! ₹${totalDebited.toFixed(2)} held from wallet. Admin review in progress.`,
      bill: newBill,
      new_balance: closeBal
    });
  } catch (error) {
    console.error('Submit Bill Error:', error);
    res.status(500).json({ success: false, message: 'Server error during bill submission' });
  }
});

// 2. List Bill Submissions (Admin)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { status, service_type, startDate, endDate, search } = req.query;

    let list = db.bill_submissions.map(b => {
      const u = db.users.find(usr => usr.id === b.user_id);
      return {
        ...b,
        user_name: b.user_name || u?.name || b.user_id,
        firm_name: b.firm_name || u?.firm_name || 'N/A',
        mobile_number: b.mobile_number || u?.mobile_number || 'N/A'
      };
    });

    if (status) {
      list = list.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    if (service_type) {
      list = list.filter(b => b.service_type.toLowerCase() === service_type.toLowerCase());
    }

    if (startDate) {
      const sDate = new Date(startDate).getTime();
      list = list.filter(b => new Date(b.created_at).getTime() >= sDate);
    }

    if (endDate) {
      const eDate = new Date(endDate).getTime() + 86400000;
      list = list.filter(b => new Date(b.created_at).getTime() <= eDate);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.consumer_number?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.user_name?.toLowerCase().includes(q) ||
        b.mobile_number?.includes(q) ||
        b.provider?.toLowerCase().includes(q) ||
        b.operator_ref?.toLowerCase().includes(q)
      );
    }

    const counts = {
      pending: db.bill_submissions.filter(b => b.status === 'pending').length,
      processing: db.bill_submissions.filter(b => b.status === 'processing').length,
      approved: db.bill_submissions.filter(b => b.status === 'approved').length,
      rejected: db.bill_submissions.filter(b => b.status === 'rejected').length,
      total: db.bill_submissions.length
    };

    res.json({
      success: true,
      bills: list,
      counts
    });
  } catch (error) {
    console.error('List Bills Error:', error);
    res.status(500).json({ success: false, message: 'Server error listing bills' });
  }
});

// 3. Claim / Lock Bill for Processing (Admin)
router.post('/claim', authenticateToken, async (req, res) => {
  try {
    const { bill_id } = req.body;
    if (!bill_id) {
      return res.status(400).json({ success: false, message: 'bill_id is required' });
    }

    const billIndex = db.bill_submissions.findIndex(b => b.id === bill_id);
    if (billIndex === -1) {
      return res.status(404).json({ success: false, message: 'Bill submission not found' });
    }

    const bill = db.bill_submissions[billIndex];
    if (bill.status !== 'pending' && bill.claimed_by !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: `Bill is already locked by Admin (${bill.claimed_by || 'Another Admin'}) with status: ${bill.status}`
      });
    }

    db.bill_submissions[billIndex].status = 'processing';
    db.bill_submissions[billIndex].claimed_by = req.user.name || req.user.id;

    res.json({
      success: true,
      message: 'Bill locked for processing. Other admins cannot process simultaneously.',
      bill: db.bill_submissions[billIndex]
    });
  } catch (error) {
    console.error('Claim Bill Error:', error);
    res.status(500).json({ success: false, message: 'Server error claiming bill' });
  }
});

// 4. Approve Offline Bill (Admin)
router.post('/approve', authenticateToken, async (req, res) => {
  try {
    const { bill_id, operator_ref, receipt_proof_url } = req.body;
    if (!bill_id || !operator_ref) {
      return res.status(400).json({
        success: false,
        message: 'bill_id and Operator Reference Number (operator_ref) are required for clearance.'
      });
    }

    const billIndex = db.bill_submissions.findIndex(b => b.id === bill_id);
    if (billIndex === -1) {
      return res.status(404).json({ success: false, message: 'Bill submission not found' });
    }

    const bill = db.bill_submissions[billIndex];
    if (bill.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Bill has already been approved.' });
    }

    db.bill_submissions[billIndex].status = 'approved';
    db.bill_submissions[billIndex].operator_ref = operator_ref;
    db.bill_submissions[billIndex].receipt_proof_url = receipt_proof_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    db.bill_submissions[billIndex].actioned_at = new Date().toISOString();
    db.bill_submissions[billIndex].claimed_by = req.user.name || req.user.id;

    // Trigger Multi-Tier Commission Distribution for DS & MS
    processCommissionDistribution(bill.user_id, 'BBPS', operator_ref, bill.total_debited);

    res.json({
      success: true,
      message: `Bill Approved successfully! Operator Ref: ${operator_ref}`,
      bill: db.bill_submissions[billIndex]
    });
  } catch (error) {
    console.error('Approve Bill Error:', error);
    res.status(500).json({ success: false, message: 'Server error approving bill' });
  }
});

// 5. Reject Offline Bill & Atomic Refund (Admin)
router.post('/reject', authenticateToken, async (req, res) => {
  try {
    const { bill_id, rejection_reason } = req.body;
    if (!bill_id || !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'bill_id and rejection_reason are required.'
      });
    }

    // Supabase RPC check
    if (supabase && isUUID(bill_id)) {
      try {
        const { data, error } = await supabase.rpc('reject_offline_bill', {
          p_bill_id: bill_id,
          p_admin_id: req.user.name || req.user.id,
          p_reason: rejection_reason
        });

        if (!error && data && data.success) {
          return res.json(data);
        }
      } catch (e) {
        console.warn('Supabase reject RPC fallback to mockStore:', e.message);
      }
    }

    const billIndex = db.bill_submissions.findIndex(b => b.id === bill_id);
    if (billIndex === -1) {
      return res.status(404).json({ success: false, message: 'Bill submission not found' });
    }

    const bill = db.bill_submissions[billIndex];
    if (bill.status === 'approved' || bill.status === 'rejected') {
      return res.status(400).json({ success: false, message: `Bill already ${bill.status}` });
    }

    // ATOMIC REFUND BACK TO RETAILER WALLET
    const userIndex = db.users.findIndex(u => u.id === bill.user_id);
    let newBalance = 0;
    if (userIndex !== -1) {
      const openBal = db.users[userIndex].wallet_balance || 0;
      newBalance = openBal + bill.total_debited;
      db.users[userIndex].wallet_balance = newBalance;

      // Credit Ledger Entry
      db.wallet_transactions.unshift({
        id: `wt_rf_${Date.now()}`,
        user_id: bill.user_id,
        amount: bill.total_debited,
        type: 'credit',
        category: 'Offline Bill Refund',
        reference_id: bill.id,
        opening_balance: openBal,
        closing_balance: newBalance,
        description: `Refund for Rejected Offline ${bill.service_type} Bill (${bill.provider}) Reason: ${rejection_reason}`,
        created_at: new Date().toISOString()
      });
    }

    db.bill_submissions[billIndex].status = 'rejected';
    db.bill_submissions[billIndex].rejection_reason = rejection_reason;
    db.bill_submissions[billIndex].actioned_at = new Date().toISOString();
    db.bill_submissions[billIndex].claimed_by = req.user.name || req.user.id;

    res.json({
      success: true,
      message: `Bill Rejected. Atomically refunded ₹${bill.total_debited.toFixed(2)} to Retailer Wallet.`,
      new_balance: newBalance,
      bill: db.bill_submissions[billIndex]
    });
  } catch (error) {
    console.error('Reject Bill Error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting bill' });
  }
});

// 6. Get Retailer's Submissions
router.get('/my-bills', authenticateToken, async (req, res) => {
  try {
    const list = db.bill_submissions.filter(b => b.user_id === req.user.id);
    res.json({
      success: true,
      bills: list
    });
  } catch (error) {
    console.error('My Bills Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching my bills' });
  }
});

export default router;
