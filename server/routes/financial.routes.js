import express from 'express';
import { db } from '../db/store.js';
import { verifyToken, sanitizeUser } from '../middleware/auth.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// POST /api/financial/transaction
// Requires valid JWT token + valid TPIN in header (x-tpin) or body (tpin)
// Performs wallet deduction and commission distribution across hierarchy!
// -----------------------------------------------------------------------------
router.post('/transaction', verifyToken, (req, res) => {
  try {
    const { type, amount, recipient_account, recipient_name, tpin } = req.body;
    const reqTpin = req.headers['x-tpin'] || tpin;
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Enforce 4-Digit TPIN Check
    if (!reqTpin) {
      return res.status(400).json({ success: false, message: 'Authorization Failed: 4-Digit TPIN is required to authorize financial transactions.' });
    }

    if (user.tpin_locked_until && new Date(user.tpin_locked_until).getTime() > Date.now()) {
      return res.status(403).json({
        success: false,
        isLocked: true,
        message: 'Transaction Denied: TPIN verification is locked due to security attempts limit.'
      });
    }

    if (user.tpin !== reqTpin.toString()) {
      user.tpin_attempts = (user.tpin_attempts || 0) + 1;
      if (user.tpin_attempts >= 3) {
        user.tpin_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      return res.status(401).json({
        success: false,
        message: `Invalid TPIN. ${Math.max(0, 3 - user.tpin_attempts)} attempt(s) remaining.`
      });
    }

    // Validate transaction parameters
    const txAmount = parseFloat(amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transaction amount.' });
    }

    // Service Charge Calculation (e.g., 0.5% or custom service charge)
    const serviceCharge = user.service_charge_enabled
      ? (user.custom_service_charge || 5.00)
      : (txAmount * (user.charge_percentage || 0.5) / 100);

    const netDeduction = txAmount + serviceCharge;

    if (user.wallet_balance < netDeduction) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Wallet Balance! Available: ₹${user.wallet_balance.toFixed(2)}, Required: ₹${netDeduction.toFixed(2)} (including ₹${serviceCharge.toFixed(2)} charges)`
      });
    }

    // Perform balance deduction
    user.wallet_balance -= netDeduction;

    // Upstream Commission Distribution (Hierarchical earnings)
    let distCommission = 0;
    let superDistCommission = 0;

    if (user.distributor_id) {
      const dist = db.users.find(u => u.id === user.distributor_id);
      if (dist) {
        distCommission = txAmount * 0.0025; // 0.25% commission to direct distributor
        dist.commission_balance += distCommission;
        dist.wallet_balance += distCommission; // auto-credit commission
      }
    }

    if (user.super_distributor_id) {
      const superDist = db.users.find(u => u.id === user.super_distributor_id);
      if (superDist) {
        superDistCommission = txAmount * 0.0015; // 0.15% master commission to Super Distributor
        superDist.commission_balance += superDistCommission;
        superDist.wallet_balance += superDistCommission;
      }
    }

    // Create Transaction Record
    const refNum = 'ASY-' + new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) + '-' + Math.floor(100 + Math.random() * 900);
    const txRecord = {
      id: 'tx_' + Date.now(),
      user_id: user.id,
      type: type || 'BILL_PAYMENT',
      amount: txAmount,
      service_charge: serviceCharge,
      net_amount: netDeduction,
      recipient_account: recipient_account || 'Utility Provider',
      recipient_name: recipient_name || 'B2B/B2C Settlement',
      status: 'SUCCESS',
      reference_number: refNum,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    };

    db.transactions.unshift(txRecord);

    return res.status(200).json({
      success: true,
      message: `Transaction Completed Successfully! Ref: ${refNum}`,
      transaction: txRecord,
      updated_wallet: user.wallet_balance,
      commissions_distributed: {
        distributor: distCommission,
        super_distributor: superDistCommission
      },
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Transaction Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing financial transaction.' });
  }
});

// GET /api/financial/transactions
// Fetch user transaction history
router.get('/transactions', verifyToken, (req, res) => {
  try {
    const user = req.user;
    let list = [];

    if (user.role === 'admin') {
      list = db.transactions;
    } else {
      list = db.transactions.filter(t => t.user_id === user.id);
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      transactions: list
    });
  } catch (error) {
    console.error('Fetch Transactions Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve transaction log.' });
  }
});

export default router;
