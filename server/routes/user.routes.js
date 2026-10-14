import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { sanitizeUser, verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Sync in-memory db.users from Supabase PostgreSQL database (users_profiles & admin_profiles)
if (supabase) {
  (async () => {
    try {
      const { data } = await supabase.from('users_profiles').select('*');
      const { data: adminData } = await supabase.from('admin_profiles').select('*');
      const combined = [...(data || [])];
      if (Array.isArray(adminData)) {
        adminData.forEach(adm => {
          if (!combined.some(u => u.id === adm.id)) combined.push(adm);
        });
      }
      db.users = combined;
    } catch (e) {
      console.error('Supabase user sync warning:', e);
    }
  })();
}

// GET /api/user/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    let user = db.users.find(u => u.id === req.user.id || (req.user.mobile_number && u.mobile_number === req.user.mobile_number));
    if (supabase) {
      const primaryTable = req.user.role === 'admin' ? 'admin_profiles' : 'users_profiles';
      const secondaryTable = req.user.role === 'admin' ? 'users_profiles' : 'admin_profiles';

      let { data } = await supabase.from(primaryTable).select('*').eq('id', req.user.id).maybeSingle();
      if (!data && req.user.mobile_number) {
        const { data: byMob } = await supabase.from(primaryTable).select('*').eq('mobile_number', req.user.mobile_number).maybeSingle();
        if (byMob) data = byMob;
      }

      if (!data) {
        let { data: secData } = await supabase.from(secondaryTable).select('*').eq('id', req.user.id).maybeSingle();
        if (!secData && req.user.mobile_number) {
          const { data: byMob } = await supabase.from(secondaryTable).select('*').eq('mobile_number', req.user.mobile_number).maybeSingle();
          if (byMob) secData = byMob;
        }
        if (secData) data = secData;
      }

      if (data) {
        user = data;
        const idx = db.users.findIndex(u => u.id === data.id || (data.mobile_number && u.mobile_number === data.mobile_number));
        if (idx !== -1) db.users[idx] = data;
        else db.users.push(data);
      }
    }
    if (!user) user = req.user;
    if (!user) return res.status(404).json({ success: false, message: 'User profile not found' });
    console.log(`[GET /me] ID: ${user.id} | Role: ${user.role} | Mobile: ${user.mobile_number} | MPIN: ${user.mpin}`);
    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Fetch Me Profile Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

// GET /api/user/admin-badge-counts
// Live pending counts for QR payment requests, CC bill requests, and KYC verifications
router.get('/admin-badge-counts', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.json({ success: true, counts: { qr_requests: 0, admin_bill_requests: 0, admin_kyc: 0, total: 0 } });
    }

    let qrPendingCount = 0;
    let ccBillPendingCount = 0;
    let kycPendingCount = 0;

    if (supabase) {
      try {
        const [qrRes, ccRes, kycRes] = await Promise.all([
          supabase.from('qr_payment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('credit_card_bill_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('kyc_verifications').select('id', { count: 'exact', head: true }).in('status', ['under_review', 'pending'])
        ]);
        qrPendingCount = qrRes.count || 0;
        ccBillPendingCount = ccRes.count || 0;
        kycPendingCount = kycRes.count || 0;
      } catch (sbErr) {
        qrPendingCount = (db.qr_payment_requests || []).filter(r => r.status === 'pending').length;
        ccBillPendingCount = (db.credit_card_bill_requests || []).filter(r => r.status === 'pending').length;
        kycPendingCount = (db.kyc_verifications || []).filter(k => k.status === 'under_review' || k.status === 'pending').length;
      }
    } else {
      qrPendingCount = (db.qr_payment_requests || []).filter(r => r.status === 'pending').length;
      ccBillPendingCount = (db.credit_card_bill_requests || []).filter(r => r.status === 'pending').length;
      kycPendingCount = (db.kyc_verifications || []).filter(k => k.status === 'under_review' || k.status === 'pending').length;
    }

    return res.json({
      success: true,
      counts: {
        qr_requests: qrPendingCount,
        admin_bill_requests: ccBillPendingCount,
        admin_kyc: kycPendingCount,
        total: qrPendingCount + ccBillPendingCount + kycPendingCount
      }
    });
  } catch (err) {
    console.error('Fetch Admin Badge Counts Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch badge counts' });
  }
});

// GET /api/user/hierarchy
// Returns mapped users based on role (Direct Supabase Database query)
router.get('/hierarchy', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users_profiles').select('*');
        if (!error && Array.isArray(data)) {
          db.users = data;
        }
      } catch (err) {
        console.error('Supabase hierarchy fetch error:', err);
      }
    }

    let mappedUsers = [];
    const allUsers = db.users || [];

    if (user && user.role === 'admin') {
      mappedUsers = allUsers.map(u => ({
        ...sanitizeUser(u),
        plain_password: u.plain_password || 'Password@123',
        mpin: u.mpin || '123456',
        tpin: u.tpin || '1234'
      }));
    } else if (user && user.role === 'super_distributor') {
      mappedUsers = allUsers
        .filter(u => u.super_distributor_id === user.id || u.id === user.id)
        .map(u => {
          const s = sanitizeUser(u);
          delete s.plain_password;
          delete s.mpin;
          delete s.tpin;
          return s;
        });
    } else if (user && user.role === 'distributor') {
      mappedUsers = allUsers
        .filter(u => u.distributor_id === user.id || u.id === user.id)
        .map(u => {
          const s = sanitizeUser(u);
          delete s.plain_password;
          delete s.mpin;
          delete s.tpin;
          return s;
        });
    } else if (user) {
      mappedUsers = [sanitizeUser(user)];
    } else {
      mappedUsers = allUsers.map(u => sanitizeUser(u));
    }

    return res.status(200).json({
      success: true,
      role: user ? user.role : 'admin',
      count: mappedUsers.length,
      users: mappedUsers
    });
  } catch (error) {
    console.error('Fetch Hierarchy Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user hierarchy.' });
  }
});

// PATCH /api/user/status (Admin Only)
// Toggle user status: 'Active', 'Inactive', 'Blocked'
router.patch('/status', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { targetUserId, newStatus, walletAdjustAmount } = req.body;
    const targetUser = db.users.find(u => u.id === targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    if (newStatus && ['Active', 'Inactive', 'Blocked'].includes(newStatus)) {
      targetUser.status = newStatus;
    }

    if (walletAdjustAmount !== undefined && !isNaN(Number(walletAdjustAmount))) {
      const adj = Number(walletAdjustAmount);
      if (targetUser.wallet_balance + adj < 0) {
        return res.status(400).json({ success: false, message: 'Adjustment would cause negative balance.' });
      }
      targetUser.wallet_balance += adj;
    }

    targetUser.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        const targetTable = targetUser.role === 'admin' ? 'admin_profiles' : 'users_profiles';
        const updatePayload = {
          status: targetUser.status,
          updated_at: targetUser.updated_at
        };
        if (targetUser.role !== 'admin') {
          updatePayload.wallet_balance = targetUser.wallet_balance;
        }
        await supabase.from(targetTable).update(updatePayload).eq('id', targetUser.id);
      } catch (sbErr) {
        console.error('Supabase Patch Status Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} status updated to ${targetUser.status}.`,
      user: sanitizeUser(targetUser)
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// POST /api/user/create-subuser (Admin, Super Distributor, Distributor)
router.post('/create-subuser', verifyToken, requireRoles(['admin', 'super_distributor', 'distributor']), async (req, res) => {
  try {
    const { 
      name, firstName, middleName, lastName, firm_name, email, mobile_number, role, 
      target_distributor_id, home_address, firm_address, profile_photo_url,
      qr_charge_percent, charge_percentage 
    } = req.body;
    const currentUser = req.user;

    const fullName = name || [firstName, middleName, lastName].filter(Boolean).join(' ') || 'New User';
    
    // Strict role enforcement by hierarchy
    let userRole = role || 'user';
    if (currentUser.role === 'super_distributor') {
      userRole = 'distributor';
    } else if (currentUser.role === 'distributor') {
      userRole = 'user';
    }

    const userFirm = firm_name || (userRole === 'distributor' ? 'Distributor Firm' : 'Retailer Firm');

    if (!mobile_number) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    if (db.users.some(u => u.mobile_number === mobile_number)) {
      return res.status(400).json({ success: false, message: `User with mobile number ${mobile_number} already exists.` });
    }

    if (supabase) {
      try {
        const { data: existingSupabaseUser } = await supabase
          .from('users_profiles')
          .select('id')
          .eq('mobile_number', mobile_number)
          .maybeSingle();
        if (existingSupabaseUser) {
          return res.status(400).json({ success: false, message: `User with mobile number ${mobile_number} already exists in database.` });
        }
      } catch (e) {}
    }

    function generateRandom8CharPassword() {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    async function generateNextUserId() {
      let nextNum = 1;
      try {
        let existingIds = (db.users || []).map(u => u.id);
        if (supabase) {
          const { data } = await supabase.from('users_profiles').select('id');
          if (data && data.length > 0) {
            existingIds = data.map(u => u.id);
          }
        }
        const numbers = existingIds
          .map(id => {
            const match = String(id).match(/aseasyswipe_(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      } catch (err) {
        console.error('Error generating user ID:', err);
      }
      return `aseasyswipe_${String(nextNum).padStart(3, '0')}`;
    }

    const newId = await generateNextUserId();
    const generatedPassword = generateRandom8CharPassword();
    const defaultPasswordHash = await bcrypt.hash(generatedPassword, 10);

    let distId = null;
    let superDistId = null;

    if (currentUser.role === 'distributor') {
      distId = currentUser.id;
      superDistId = currentUser.super_distributor_id;
    } else if (currentUser.role === 'super_distributor') {
      superDistId = currentUser.id;
      distId = target_distributor_id || null;
    } else if (currentUser.role === 'admin') {
      if (userRole === 'user') {
        distId = target_distributor_id || null;
        if (distId) {
          const parentDs = db.users.find(u => u.id === distId);
          if (parentDs) superDistId = parentDs.super_distributor_id || null;
        }
      } else if (userRole === 'distributor') {
        superDistId = target_distributor_id || null;
        distId = null;
      }
    }

    const userChargePct = qr_charge_percent !== undefined 
      ? parseFloat(qr_charge_percent) 
      : (charge_percentage !== undefined ? parseFloat(charge_percentage) : (userRole === 'user' ? 0.50 : 0.25));

    const newUser = {
      id: newId,
      name: fullName,
      firm_name: userFirm,
      email: email || `${mobile_number}@aseasyswipe.com`,
      mobile_number,
      password: defaultPasswordHash,
      plain_password: 'Password@123',
      must_change_password: true, // Requires first login password change!
      role: userRole,
      status: 'Active',
      profile_photo_url: profile_photo_url || '',
      wallet_balance: 0.00,
      commission_balance: 0.00,
      tpin: '1234',
      tpin_set: false,
      mpin: '123456',
      mpin_set: false,
      qr_charge_percent: userChargePct,
      distributor_id: distId,
      super_distributor_id: superDistId,
      kyc_status: userRole === 'admin' ? 'verified' : 'not_submitted',
      kyc_rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.users.push(newUser);
    if (supabase) {
      try {
        const targetTable = newUser.role === 'admin' ? 'admin_profiles' : 'users_profiles';
        const payload = { ...newUser };
        if (newUser.role === 'admin') {
          delete payload.tpin;
          delete payload.tpin_set;
          delete payload.wallet_balance;
          delete payload.commission_balance;
          delete payload.qr_charge_percent;
          delete payload.distributor_id;
          delete payload.super_distributor_id;
          delete payload.kyc_status;
          delete payload.kyc_rejection_reason;
          delete payload.mpin_set;
        }
        const { error: sbErr } = await supabase.from(targetTable).insert([payload]);
        if (sbErr) {
          console.error('Supabase Insert User Error:', sbErr);
          db.users = db.users.filter(u => u.id !== newId);
          return res.status(400).json({
            success: false,
            message: sbErr.message.includes('unique constraint') || sbErr.message.includes('already exists')
              ? `User with mobile number ${mobile_number} or email already exists in database.`
              : sbErr.message
          });
        }
      } catch (err) {
        console.error('Supabase Insert User Catch Error:', err);
      }
    }

    return res.status(201).json({
      success: true,
      message: `New ${userRole.toUpperCase()} registered successfully! Generated password: ${generatedPassword}. First login password change mandatory.`,
      user: sanitizeUser(newUser),
      generatedPassword
    });
  } catch (error) {
    console.error('Create Subuser Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating downstream user: ' + error.message });
  }
});

// DELETE /api/user/:id (Admin Only)
router.delete('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = db.users.find(u => u.id === userId || String(u.id) === String(userId));

    if (supabase) {
      try {
        // 1. Unlink child users referencing this user as distributor_id or super_distributor_id
        await supabase.from('users_profiles').update({ distributor_id: null }).eq('distributor_id', userId);
        await supabase.from('users_profiles').update({ super_distributor_id: null }).eq('super_distributor_id', userId);

        // 2. Clean up foreign key references in credit_card_bill_requests
        try {
          await supabase.from('credit_card_bill_requests').update({ processed_by: null }).eq('processed_by', userId);
          await supabase.from('credit_card_bill_requests').delete().eq('user_id', userId);
        } catch (e) {
          console.warn('Bill requests cleanup notice:', e.message);
        }

        // 3. Clean up foreign key references in qr_payment_requests
        try {
          await supabase.from('qr_payment_requests').update({ processed_by: null }).eq('processed_by', userId);
          await supabase.from('qr_payment_requests').delete().eq('user_id', userId);
        } catch (e) {
          console.warn('QR requests cleanup notice:', e.message);
        }

        // 4. Clean up other potential tables (payment_submissions, wallet_transactions, bill_payments)
        try { await supabase.from('payment_submissions').update({ processed_by: null }).eq('processed_by', userId); } catch (e) {}
        try { await supabase.from('payment_submissions').delete().eq('user_id', userId); } catch (e) {}
        try { await supabase.from('wallet_transactions').delete().eq('user_id', userId); } catch (e) {}
        try { await supabase.from('bill_payments').delete().eq('user_id', userId); } catch (e) {}

        // 5. Delete user profile from Supabase PostgreSQL database
        const targetTable = targetUser && targetUser.role === 'admin' ? 'admin_profiles' : 'users_profiles';
        const { error: sbErr } = await supabase.from(targetTable).delete().eq('id', userId);
        if (sbErr) {
          console.error('Supabase Delete User Error:', sbErr);
          return res.status(500).json({ success: false, message: 'Failed to delete user from database: ' + sbErr.message });
        }
      } catch (err) {
        console.error('Supabase Delete User Catch Error:', err);
        return res.status(500).json({ success: false, message: 'Database error deleting user: ' + err.message });
      }
    }

    // Clean in-memory state
    db.users.forEach(u => {
      if (u.distributor_id === userId) u.distributor_id = null;
      if (u.super_distributor_id === userId) u.super_distributor_id = null;
    });
    db.users = db.users.filter(u => u.id !== userId && String(u.id) !== String(userId));

    if (db.qr_payment_requests) {
      db.qr_payment_requests = db.qr_payment_requests.filter(r => r.user_id !== userId && String(r.user_id) !== String(userId));
      db.qr_payment_requests.forEach(r => {
        if (r.processed_by === userId) r.processed_by = null;
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${targetUser ? targetUser.name : userId} deleted successfully.`
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user: ' + error.message });
  }
});

// PUT /api/user/:id (Admin Only)
router.put('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const { 
      name, firstName, middleName, lastName, firm_name, mobile_number, role, 
      email, status, home_address, firm_address, profile_photo_url, target_distributor_id,
      qr_charge_percent, charge_percentage 
    } = req.body;

    if (firstName !== undefined) targetUser.first_name = firstName;
    if (middleName !== undefined) targetUser.middle_name = middleName;
    if (lastName !== undefined) targetUser.last_name = lastName;
    
    if (name) {
      targetUser.name = name;
    } else if (firstName || lastName) {
      targetUser.name = [firstName || targetUser.first_name, middleName || targetUser.middle_name, lastName || targetUser.last_name].filter(Boolean).join(' ');
    }

    if (firm_name) targetUser.firm_name = firm_name;
    if (mobile_number) targetUser.mobile_number = mobile_number;
    if (role) targetUser.role = role;
    if (email !== undefined) targetUser.email = email;
    if (status) targetUser.status = status;
    if (home_address !== undefined) targetUser.home_address = home_address;
    if (firm_address !== undefined) targetUser.firm_address = firm_address;
    if (profile_photo_url !== undefined) targetUser.profile_photo_url = profile_photo_url;
    if (target_distributor_id !== undefined) targetUser.distributor_id = target_distributor_id || null;

    const newChargeVal = qr_charge_percent !== undefined 
      ? parseFloat(qr_charge_percent) 
      : (charge_percentage !== undefined ? parseFloat(charge_percentage) : undefined);

    if (newChargeVal !== undefined && !isNaN(newChargeVal)) {
      targetUser.qr_charge_percent = newChargeVal;
      targetUser.charge_percentage = newChargeVal;
    }

    targetUser.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        const targetTable = targetUser.role === 'admin' ? 'admin_profiles' : 'users_profiles';
        const payload = { ...targetUser };
        if (targetUser.role === 'admin') {
          delete payload.tpin;
          delete payload.wallet_balance;
          delete payload.commission_balance;
          delete payload.qr_charge_percent;
          delete payload.distributor_id;
          delete payload.super_distributor_id;
        }
        await supabase.from(targetTable).update(payload).eq('id', userId);
      } catch (sbErr) {
        console.error('Supabase Update User Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} updated successfully.`,
      user: sanitizeUser(targetUser)
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

export default router;
