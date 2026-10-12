import express from 'express';
import { db } from '../db/store.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { processCommissionDistribution } from './commission.routes.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// POST /api/submissions/submit (Retailer Workflow)
// Validates 12-digit UTR, checks duplicate UTR, saves screenshot & submission
// -----------------------------------------------------------------------------
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { amount, utr_number, qr_id, screenshot_url } = req.body;
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'User profile not found.' });

    const submitAmount = parseFloat(amount);
    if (isNaN(submitAmount) || submitAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount greater than ₹0.' });
    }

    // 1. Instant 12-digit UTR Regex Validation (/^\d{12}$/)
    const utrRegex = /^\d{12}$/;
    if (!utr_number || !utrRegex.test(utr_number.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UTR Number: Must be an exact 12-digit numeric reference number (e.g., 202610059901).'
      });
    }

    const cleanUtr = utr_number.toString().trim();

    // 2. Duplicate UTR Check
    const exists = db.payment_submissions.some(s => s.utr_number === cleanUtr);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Duplicate UTR Error: Reference number ${cleanUtr} has already been submitted for verification.`
      });
    }

    if (!screenshot_url) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required.' });
    }

    const newSubmission = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: user.id,
      amount: submitAmount,
      utr_number: cleanUtr,
      qr_id: qr_id ? parseInt(qr_id) : 1,
      screenshot_url,
      status: 'pending',
      actioned_by: null,
      actioned_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString()
    };

    db.payment_submissions.unshift(newSubmission);

    // If real Supabase instance exists, insert to Supabase for real-time table listeners
    if (supabase) {
      try {
        await supabase.from('payment_submissions').insert([newSubmission]);
      } catch (err) {
        console.warn('Supabase sync skipped:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Payment Request Submitted Successfully! Admin review in progress.',
      submission: newSubmission
    });
  } catch (error) {
    console.error('Submit Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing payment submission.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/submissions/list (Admin View)
// Status tabs (pending, approved, rejected, all), search (UTR, Mobile, Name), date filters
// -----------------------------------------------------------------------------
router.get('/list', verifyToken, requireRoles(['admin']), (req, res) => {
  try {
    const { status = 'all', search = '', startDate, endDate } = req.query;

    let list = db.payment_submissions.map(sub => {
      const u = db.users.find(usr => usr.id === sub.user_id);
      const qr = db.qr_master.find(q => q.id === sub.qr_id);
      return {
        ...sub,
        user_name: u ? u.name : 'Unknown Retailer',
        firm_name: u ? u.firm_name : 'Merchant Firm',
        mobile_number: u ? u.mobile_number : '',
        bank_name: qr ? qr.bank_name : 'Master Bank QR'
      };
    });

    if (status !== 'all') {
      list = list.filter(s => s.status === status);
    }

    if (search) {
      const query = search.toString().toLowerCase();
      list = list.filter(s =>
        s.utr_number.toLowerCase().includes(query) ||
        s.user_name.toLowerCase().includes(query) ||
        s.firm_name.toLowerCase().includes(query) ||
        s.mobile_number.includes(query)
      );
    }

    if (startDate) {
      list = list.filter(s => new Date(s.created_at) >= new Date(startDate.toString()));
    }
    if (endDate) {
      list = list.filter(s => new Date(s.created_at) <= new Date(endDate.toString()));
    }

    const counts = {
      pending: db.payment_submissions.filter(s => s.status === 'pending').length,
      approved: db.payment_submissions.filter(s => s.status === 'approved').length,
      rejected: db.payment_submissions.filter(s => s.status === 'rejected').length,
      total: db.payment_submissions.length
    };

    return res.status(200).json({
      success: true,
      counts,
      submissions: list
    });
  } catch (error) {
    console.error('Fetch Submissions Error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving payment submissions.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/submissions/approve (Admin 1-Click Atomic RPC Approval)
// Emulates public.approve_qr_payment function:
// Row Lock -> Update wallet_balance -> Insert Ledger record -> Update QR collection
// -----------------------------------------------------------------------------
router.post('/approve', verifyToken, requireRoles(['admin']), (req, res) => {
  try {
    const { submission_id } = req.body;
    const adminId = req.user.id;

    const sub = db.payment_submissions.find(s => s.id === submission_id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found.' });
    }

    if (sub.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Transaction already actioned as ${sub.status.toUpperCase()}.` });
    }

    const user = db.users.find(u => u.id === sub.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Target retailer profile not found.' });
    }

    // Atomic Double-Entry Calculation
    const openBal = Number(user.wallet_balance);
    const closeBal = openBal + Number(sub.amount);

    // 1. Update user balance
    user.wallet_balance = closeBal;
    user.updated_at = new Date().toISOString();

    // 2. Mark submission approved
    sub.status = 'approved';
    sub.actioned_by = adminId;
    sub.actioned_at = new Date().toISOString();

    // 3. Insert ledger record in wallet_transactions
    const ledgerEntry = {
      id: 'wt_' + Date.now(),
      user_id: user.id,
      amount: sub.amount,
      type: 'credit',
      category: 'QR Fund Add',
      reference_id: sub.utr_number,
      opening_balance: openBal,
      closing_balance: closeBal,
      description: `Wallet loaded via UPI UTR: ${sub.utr_number}`,
      created_at: new Date().toISOString()
    };
    db.wallet_transactions.unshift(ledgerEntry);

    // 4. Update QR current day collection
    if (sub.qr_id) {
      const qr = db.qr_master.find(q => q.id === sub.qr_id);
      if (qr) {
        qr.current_day_collection = Number(qr.current_day_collection) + Number(sub.amount);
        qr.updated_at = new Date().toISOString();
      }
    }

    // 5. Trigger Multi-Tier Commission Distribution for DS & MS
    processCommissionDistribution(user.id, 'QR_FUND', sub.utr_number, sub.amount);

    return res.status(200).json({
      success: true,
      message: `Payment Approved! ₹${sub.amount.toFixed(2)} credited to ${user.name}. New Balance: ₹${closeBal.toFixed(2)}`,
      submission: sub,
      new_balance: closeBal
    });
  } catch (error) {
    console.error('Approve Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error approving payment.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/submissions/reject (Admin Rejection Workflow)
// -----------------------------------------------------------------------------
router.post('/reject', verifyToken, requireRoles(['admin']), (req, res) => {
  try {
    const { submission_id, rejection_reason } = req.body;
    const adminId = req.user.id;

    const sub = db.payment_submissions.find(s => s.id === submission_id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found.' });
    }

    if (sub.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Transaction already actioned as ${sub.status.toUpperCase()}.` });
    }

    sub.status = 'rejected';
    sub.actioned_by = adminId;
    sub.actioned_at = new Date().toISOString();
    sub.rejection_reason = rejection_reason || 'UTR Not Matched';

    return res.status(200).json({
      success: true,
      message: `Payment Request Rejected. Reason: ${sub.rejection_reason}`,
      submission: sub
    });
  } catch (error) {
    console.error('Reject Payment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error rejecting payment.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/submissions/my-submissions (Retailer View)
// -----------------------------------------------------------------------------
router.get('/my-submissions', verifyToken, (req, res) => {
  try {
    const list = db.payment_submissions
      .filter(s => s.user_id === req.user.id)
      .map(sub => {
        const qr = db.qr_master.find(q => q.id === sub.qr_id);
        return {
          ...sub,
          bank_name: qr ? qr.bank_name : 'Master Bank QR'
        };
      });

    return res.status(200).json({
      success: true,
      count: list.length,
      submissions: list
    });
  } catch (error) {
    console.error('Fetch My Submissions Error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving your submission history.' });
  }
});

export default router;
