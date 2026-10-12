import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// HELPER: Realtime Commission Distribution Engine (Exported for transaction routes)
export const processCommissionDistribution = async (sourceUserId, serviceType, transactionRef, amount) => {
  try {
    const txAmt = parseFloat(amount || 0);
    if (!sourceUserId || !serviceType || !transactionRef || txAmt <= 0) return;

    // Check Supabase RPC
    if (supabase) {
      try {
        await supabase.rpc('process_transaction_commission', {
          p_source_user_id: sourceUserId,
          p_service_type: serviceType,
          p_transaction_ref: transactionRef,
          p_amount: txAmt
        });
      } catch (e) {
        console.warn('Supabase commission RPC error fallback to mockStore:', e.message);
      }
    }

    // MockStore Calculation
    const sourceUser = db.users.find(u => u.id === sourceUserId);
    if (!sourceUser) return;

    // Find slab
    const slab = db.commission_slabs.find(s =>
      s.service_type === serviceType && txAmt >= s.min_amount && txAmt <= s.max_amount
    ) || db.commission_slabs.find(s => s.service_type === serviceType);

    if (!slab) return;

    // 1. Credit Distributor (DS)
    if (sourceUser.distributor_id) {
      const dsIndex = db.users.findIndex(u => u.id === sourceUser.distributor_id);
      if (dsIndex !== -1 && slab.distributor_commission > 0) {
        const dsEarned = slab.is_percentage
          ? (txAmt * slab.distributor_commission) / 100.0
          : slab.distributor_commission;

        db.users[dsIndex].commission_balance = (db.users[dsIndex].commission_balance || 0) + dsEarned;

        db.commission_ledger.unshift({
          id: `comm_${Date.now()}_ds`,
          beneficiary_user_id: sourceUser.distributor_id,
          source_user_id: sourceUserId,
          source_user_name: sourceUser.name,
          service_type: serviceType,
          transaction_ref: transactionRef,
          transaction_amount: txAmt,
          commission_earned: parseFloat(dsEarned.toFixed(2)),
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Credit Super Distributor (MS)
    if (sourceUser.super_distributor_id) {
      const msIndex = db.users.findIndex(u => u.id === sourceUser.super_distributor_id);
      if (msIndex !== -1 && slab.super_distributor_commission > 0) {
        const msEarned = slab.is_percentage
          ? (txAmt * slab.super_distributor_commission) / 100.0
          : slab.super_distributor_commission;

        db.users[msIndex].commission_balance = (db.users[msIndex].commission_balance || 0) + msEarned;

        db.commission_ledger.unshift({
          id: `comm_${Date.now()}_ms`,
          beneficiary_user_id: sourceUser.super_distributor_id,
          source_user_id: sourceUserId,
          source_user_name: sourceUser.name,
          service_type: serviceType,
          transaction_ref: transactionRef,
          transaction_amount: txAmt,
          commission_earned: parseFloat(msEarned.toFixed(2)),
          created_at: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('Error processing commission distribution:', err);
  }
};

// 1. Get Active Commission Slabs
router.get('/slabs', verifyToken, (req, res) => {
  res.json({
    success: true,
    slabs: db.commission_slabs
  });
});

// 2. Update / Configure Commission Slabs (Admin Only)
router.post('/slabs', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Admins can configure commission slabs' });
    }

    const { service_type, min_amount, max_amount, retailer_charge, distributor_commission, super_distributor_commission, is_percentage } = req.body;
    if (!service_type || min_amount === undefined || max_amount === undefined) {
      return res.status(400).json({ success: false, message: 'Invalid slab parameters' });
    }

    const newSlab = {
      id: db.commission_slabs.length + 1,
      service_type,
      min_amount: parseFloat(min_amount),
      max_amount: parseFloat(max_amount),
      retailer_charge: parseFloat(retailer_charge || 0),
      distributor_commission: parseFloat(distributor_commission || 0),
      super_distributor_commission: parseFloat(super_distributor_commission || 0),
      is_percentage: !!is_percentage,
      created_at: new Date().toISOString()
    };

    db.commission_slabs.push(newSlab);

    res.json({
      success: true,
      message: 'Commission slab saved successfully',
      slab: newSlab
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving slab' });
  }
});

// 3. Commission Statement / Passbook Ledger
router.get('/ledger', verifyToken, (req, res) => {
  try {
    const { service_type, startDate, endDate, search } = req.query;

    let ledger = db.commission_ledger;

    // Filter by beneficiary unless admin viewing all
    if (req.user.role !== 'admin') {
      ledger = ledger.filter(l => l.beneficiary_user_id === req.user.id);
    }

    if (service_type && service_type !== 'ALL') {
      ledger = ledger.filter(l => l.service_type.toLowerCase() === service_type.toLowerCase());
    }

    if (startDate) {
      const sTime = new Date(startDate).getTime();
      ledger = ledger.filter(l => new Date(l.created_at).getTime() >= sTime);
    }

    if (endDate) {
      const eTime = new Date(endDate).getTime() + 86400000;
      ledger = ledger.filter(l => new Date(l.created_at).getTime() <= eTime);
    }

    if (search) {
      const q = search.toLowerCase();
      ledger = ledger.filter(l =>
        l.source_user_name?.toLowerCase().includes(q) ||
        l.transaction_ref?.toLowerCase().includes(q) ||
        l.service_type?.toLowerCase().includes(q)
      );
    }

    const totalEarned = ledger.reduce((acc, l) => acc + (l.commission_earned || 0), 0);

    res.json({
      success: true,
      ledger,
      total_earned: parseFloat(totalEarned.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching commission statement' });
  }
});

// 4. Mapped Retailers Performance Summary (For DS and MS)
router.get('/mapped-retailers', verifyToken, (req, res) => {
  try {
    let mappedUsers = [];
    if (req.user.role === 'distributor') {
      mappedUsers = db.users.filter(u => u.distributor_id === req.user.id);
    } else if (req.user.role === 'super_distributor') {
      mappedUsers = db.users.filter(u => u.super_distributor_id === req.user.id || u.distributor_id === req.user.id);
    } else {
      // Admin sees all retailers
      mappedUsers = db.users.filter(u => u.role === 'user');
    }

    const mappedPerformance = mappedUsers.map(u => {
      // Calculate turnover from submissions, tx, bills
      const userTx = db.transactions.filter(t => t.user_id === u.id);
      const userTopups = db.payment_submissions.filter(s => s.user_id === u.id && s.status === 'approved');
      const userBills = db.bill_submissions.filter(b => b.user_id === u.id && (b.status === 'approved' || b.status === 'pending'));

      const txVolume = userTx.reduce((acc, t) => acc + (t.amount || 0), 0);
      const topupVolume = userTopups.reduce((acc, t) => acc + (t.amount || 0), 0);
      const billVolume = userBills.reduce((acc, b) => acc + (b.total_debited || 0), 0);

      const totalTurnover = txVolume + topupVolume + billVolume;
      const totalCount = userTx.length + userTopups.length + userBills.length;

      return {
        id: u.id,
        name: u.name,
        firm_name: u.firm_name,
        mobile_number: u.mobile_number,
        role: u.role,
        status: u.status,
        wallet_balance: u.wallet_balance || 0,
        kyc_status: u.kyc_status,
        total_turnover: parseFloat(totalTurnover.toFixed(2)),
        total_tx_count: totalCount,
        created_at: u.created_at
      };
    });

    res.json({
      success: true,
      retailers: mappedPerformance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching mapped retailers' });
  }
});

// 5. Distributor Summary KPIs
router.get('/distributor-summary', verifyToken, (req, res) => {
  try {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let mappedCount = 0;
    let mappedUserIds = [];

    if (user.role === 'distributor') {
      mappedUserIds = db.users.filter(u => u.distributor_id === user.id).map(u => u.id);
    } else if (user.role === 'super_distributor') {
      mappedUserIds = db.users.filter(u => u.super_distributor_id === user.id || u.distributor_id === user.id).map(u => u.id);
    } else {
      mappedUserIds = db.users.map(u => u.id);
    }
    mappedCount = mappedUserIds.length;

    // Today's turnover volume by mapped retailers
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTopups = db.payment_submissions.filter(s =>
      mappedUserIds.includes(s.user_id) && s.status === 'approved' && s.created_at.startsWith(todayStr)
    );
    const todayBills = db.bill_submissions.filter(b =>
      mappedUserIds.includes(b.user_id) && b.created_at.startsWith(todayStr)
    );

    const todayVolume = todayTopups.reduce((a, c) => a + (c.amount || 0), 0) +
                        todayBills.reduce((a, c) => a + (c.total_debited || 0), 0);

    // Total commission earned
    const myLedger = db.commission_ledger.filter(l => l.beneficiary_user_id === user.id);
    const totalEarned = myLedger.reduce((a, c) => a + (c.commission_earned || 0), 0);

    res.json({
      success: true,
      summary: {
        mapped_retailers_count: mappedCount,
        today_retailer_volume: parseFloat(todayVolume.toFixed(2)),
        total_commission_earned: parseFloat(totalEarned.toFixed(2)),
        withdrawable_balance: parseFloat((user.commission_balance || 0).toFixed(2)),
        main_wallet_balance: parseFloat((user.wallet_balance || 0).toFixed(2))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching distributor summary' });
  }
});

// 6. Transfer Commission to Main Wallet (TPIN Auth)
router.post('/transfer-to-wallet', verifyToken, async (req, res) => {
  try {
    const { amount, tpin } = req.body;
    const transferAmount = parseFloat(amount);

    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transfer amount' });
    }

    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = db.users[userIndex];

    // TPIN Check
    if (!tpin || tpin !== user.tpin) {
      return res.status(401).json({ success: false, message: 'Invalid TPIN Code' });
    }

    // Balance Check
    const commBal = user.commission_balance || 0;
    if (commBal < transferAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient withdrawable commission balance. Available: ₹${commBal.toFixed(2)}`
      });
    }

    // Check Supabase RPC
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('transfer_commission_to_main_wallet', {
          p_user_id: user.id,
          p_amount: transferAmount
        });

        if (!error && data && data.success) {
          return res.json(data);
        }
      } catch (e) {
        console.warn('Supabase commission transfer RPC error fallback:', e.message);
      }
    }

    // Atomic MockStore Update
    const openWallet = user.wallet_balance || 0;
    const newWallet = openWallet + transferAmount;
    const newComm = commBal - transferAmount;

    db.users[userIndex].commission_balance = newComm;
    db.users[userIndex].wallet_balance = newWallet;

    // Credit Transaction Ledger Entry
    db.wallet_transactions.unshift({
      id: `wt_comm_${Date.now()}`,
      user_id: user.id,
      amount: transferAmount,
      type: 'credit',
      category: 'Commission Transfer',
      reference_id: `COMM_TRF_${Date.now()}`,
      opening_balance: openWallet,
      closing_balance: newWallet,
      description: 'Commission Wallet payout transferred to Main Operating Wallet',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `🎉 Transferred ₹${transferAmount.toFixed(2)} from Commission Wallet to Main Wallet!`,
      new_wallet_balance: newWallet,
      new_commission_balance: newComm
    });
  } catch (err) {
    console.error('Transfer Commission Error:', err);
    res.status(500).json({ success: false, message: 'Error transferring commission to wallet' });
  }
});

export default router;
