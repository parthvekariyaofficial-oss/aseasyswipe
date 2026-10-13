import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate QR status
const computeQrStatus = (qr) => {
  if (!qr.is_active) return 'Inactive';
  return 'Active';
};

// -----------------------------------------------------------------------------
// GET /api/qr/master/list (Direct Supabase Database Query)
// -----------------------------------------------------------------------------
router.get('/master/list', verifyToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('qr_masters').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        db.qr_masters = data;
        db.qr_master = data;
      }
    }

    const list = (db.qr_masters || []).map(qr => ({
      ...qr,
      status: computeQrStatus(qr)
    }));

    return res.status(200).json({
      success: true,
      count: list.length,
      qr_masters: list
    });
  } catch (error) {
    console.error('Fetch QR Master List Error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving QR Master list.' });
  }
});

// Alias GET /api/qr/list for backwards compatibility
router.get('/list', verifyToken, (req, res) => {
  const list = (db.qr_masters || []).map(qr => ({
    ...qr,
    status: computeQrStatus(qr)
  }));
  return res.status(200).json({ success: true, count: list.length, qr_masters: list });
});

// -----------------------------------------------------------------------------
// POST /api/qr/master/create (Admin Only - Entry Page)
// -----------------------------------------------------------------------------
router.post('/master/create', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { name, mobile_number, upi_id, default_charge_percent, qr_image_url, bank_name, account_holder_name } = req.body;

    if (!name || !mobile_number || !upi_id) {
      return res.status(400).json({ success: false, message: 'QR Name, Mobile Number, and UPI ID are required.' });
    }

    const newId = 'qrm_' + Date.now();
    const finalQrUrl = qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi_id)}%26pn=${encodeURIComponent(name)}`;

    const newQr = {
      id: newId,
      name,
      mobile_number,
      upi_id,
      default_charge_percent: parseFloat(default_charge_percent) || 0.50,
      qr_image_url: finalQrUrl,
      is_active: true,
      is_selected: (db.qr_masters || []).length === 0,
      bank_name: bank_name || 'HDFC Bank',
      account_holder_name: account_holder_name || name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      const { error } = await supabase.from('qr_masters').insert([newQr]);
      if (error) console.error('Supabase QR Insert Warning:', error);
    }

    db.qr_masters.unshift(newQr);

    return res.status(201).json({
      success: true,
      message: `New Master QR "${name}" created successfully!`,
      qr_master: newQr
    });
  } catch (error) {
    console.error('Create QR Master Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating QR Master.' });
  }
});

// -----------------------------------------------------------------------------
// PUT /api/qr/master/:id (Admin Only - Edit Entry)
// -----------------------------------------------------------------------------
router.put('/master/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    const { name, mobile_number, upi_id, default_charge_percent, qr_image_url } = req.body;
    if (name) qr.name = name;
    if (mobile_number) qr.mobile_number = mobile_number;
    if (upi_id) {
      qr.upi_id = upi_id;
      if (!qr_image_url) {
        qr.qr_image_url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi_id)}%26pn=${encodeURIComponent(qr.name)}`;
      }
    }
    if (default_charge_percent !== undefined) qr.default_charge_percent = parseFloat(default_charge_percent);
    if (qr_image_url) qr.qr_image_url = qr_image_url;
    qr.updated_at = new Date().toISOString();

    if (supabase) {
      const { error } = await supabase.from('qr_masters').update({
        name: qr.name,
        mobile_number: qr.mobile_number,
        upi_id: qr.upi_id,
        default_charge_percent: qr.default_charge_percent,
        qr_image_url: qr.qr_image_url,
        updated_at: qr.updated_at
      }).eq('id', qr.id);
      if (error) console.error('Supabase QR Edit Error:', error);
    }

    return res.status(200).json({
      success: true,
      message: `QR Master "${qr.name}" updated successfully.`,
      qr_master: qr
    });
  } catch (error) {
    console.error('Edit QR Master Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update QR Master.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/qr/master/:id/toggle (Admin Only - On/Off Toggle Switch)
// -----------------------------------------------------------------------------
router.patch('/master/:id/toggle', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    qr.is_active = !qr.is_active;
    qr.updated_at = new Date().toISOString();

    if (supabase) {
      const { error } = await supabase.from('qr_masters').update({
        is_active: qr.is_active,
        updated_at: qr.updated_at
      }).eq('id', qr.id);
      if (error) console.error('Supabase QR Toggle Error:', error);
    }

    return res.status(200).json({
      success: true,
      message: `QR "${qr.name}" is now ${qr.is_active ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}.`,
      qr_master: qr
    });
  } catch (error) {
    console.error('Toggle QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle QR status.' });
  }
});

// Alias for patch toggle active
router.patch('/toggle-active/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  const qrId = req.params.id;
  const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));
  if (!qr) return res.status(404).json({ success: false, message: 'QR not found.' });
  qr.is_active = !qr.is_active;
  qr.updated_at = new Date().toISOString();
  if (supabase) {
    await supabase.from('qr_masters').update({ is_active: qr.is_active, updated_at: qr.updated_at }).eq('id', qr.id);
  }
  return res.status(200).json({ success: true, message: `QR status toggled to ${qr.is_active ? 'ON' : 'OFF'}`, qr_master: qr });
});

// -----------------------------------------------------------------------------
// DELETE /api/qr/master/:id (Admin Only)
// -----------------------------------------------------------------------------
router.delete('/master/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const targetQr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (supabase) {
      try {
        // 1. Unlink foreign key references in qr_payment_requests first
        await supabase.from('qr_payment_requests').update({ qr_master_id: null }).eq('qr_master_id', qrId);

        // 2. Delete QR master entry from Supabase PostgreSQL database
        const { error: sbErr } = await supabase.from('qr_masters').delete().eq('id', qrId);
        if (sbErr) {
          console.error('Supabase QR Delete Error:', sbErr);
          return res.status(500).json({ success: false, message: 'Failed to delete QR from database: ' + sbErr.message });
        }
      } catch (err) {
        console.error('Supabase QR Delete Catch Error:', err);
        return res.status(500).json({ success: false, message: 'Database error deleting QR: ' + err.message });
      }
    }

    // Clean in-memory state
    db.qr_masters = db.qr_masters.filter(q => q.id !== qrId && String(q.id) !== String(qrId));
    db.qr_master = db.qr_masters;

    if (db.qr_payment_requests) {
      db.qr_payment_requests.forEach(r => {
        if (r.qr_master_id === qrId) r.qr_master_id = null;
      });
    }

    return res.status(200).json({
      success: true,
      message: `QR "${targetQr ? targetQr.name : qrId}" deleted successfully.`
    });
  } catch (error) {
    console.error('Delete QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete QR entry: ' + error.message });
  }
});

router.delete('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    if (supabase) {
      await supabase.from('qr_payment_requests').update({ qr_master_id: null }).eq('qr_master_id', qrId);
      await supabase.from('qr_masters').delete().eq('id', qrId);
    }
    db.qr_masters = db.qr_masters.filter(q => q.id !== qrId && String(q.id) !== String(qrId));
    db.qr_master = db.qr_masters;
    return res.status(200).json({ success: true, message: `QR deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete QR.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/master/:id/select (Set Active QR for User Panel)
// -----------------------------------------------------------------------------
router.post('/master/:id/select', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const target = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!target) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    db.qr_masters.forEach(q => {
      q.is_selected = (q.id === target.id || String(q.id) === String(target.id));
    });

    target.is_active = true; // Automatically turn ON when selected
    target.updated_at = new Date().toISOString();

    if (supabase) {
      // Unselect all QRs in Supabase
      const { error: unselectErr } = await supabase
        .from('qr_masters')
        .update({ is_selected: false })
        .neq('id', 'dummy_non_existent_id');
      if (unselectErr) console.error('Supabase QR Unselect All Error:', unselectErr);

      // Select target QR and activate in Supabase
      const { error: selectErr } = await supabase
        .from('qr_masters')
        .update({ is_selected: true, is_active: true, updated_at: target.updated_at })
        .eq('id', target.id);
      if (selectErr) console.error('Supabase QR Select Target Error:', selectErr);
    }

    return res.status(200).json({
      success: true,
      message: `QR "${target.name}" is now set as the active User Panel QR!`,
      qr_master: target
    });
  } catch (error) {
    console.error('Select Active QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to set active QR.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/active & /api/qr/active-for-retailer
// Directly queries Supabase PostgreSQL for the Admin Selected & Active QR
// -----------------------------------------------------------------------------
const fetchActiveQrFromDb = async () => {
  let activeQr = null;

  if (supabase) {
    try {
      // 1. Fetch QR explicitly set as is_selected = true and is_active = true
      const { data: selectedData, error: selErr } = await supabase
        .from('qr_masters')
        .select('*')
        .eq('is_selected', true)
        .eq('is_active', true)
        .maybeSingle();

      if (!selErr && selectedData) {
        activeQr = selectedData;
      } else {
        // 2. Fallback: fetch active QR with is_active = true ordered by updated_at
        const { data: activeData, error: actErr } = await supabase
          .from('qr_masters')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!actErr && activeData && activeData.length > 0) {
          activeQr = activeData[0];
        }
      }
    } catch (err) {
      console.error('Supabase Active QR Fetch Error:', err);
    }
  }

  // Fallback to in-memory store if DB query yielded nothing
  if (!activeQr) {
    activeQr = (db.qr_masters || []).find(q => q.is_selected && q.is_active) ||
               (db.qr_masters || []).find(q => q.is_active) ||
               (db.qr_masters || [])[0] || null;
  }

  return activeQr;
};

router.get('/active', verifyToken, async (req, res) => {
  try {
    const activeQr = await fetchActiveQrFromDb();
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true };
    }

    return res.status(200).json({
      success: true,
      qr_master: activeQr,
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Get Active QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get active QR.' });
  }
});

router.get('/active-for-retailer', verifyToken, async (req, res) => {
  try {
    const activeQr = await fetchActiveQrFromDb();
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true };
    }
    return res.status(200).json({ success: true, qr_master: activeQr, settings: db.system_settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active QR' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/settings (Fetch User QR Visibility & Request System Toggles)
// -----------------------------------------------------------------------------
router.get('/settings', verifyToken, async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true
      };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'qr_controls')
          .maybeSingle();
        if (!error && data) {
          db.system_settings.user_qr_visible = data.user_qr_visible !== false;
          db.system_settings.qr_request_section_enabled = data.qr_request_section_enabled !== false;
          if (data.live_bill_pay_enabled !== undefined) {
            db.system_settings.live_bill_pay_enabled = data.live_bill_pay_enabled !== false;
          }
        }
      } catch (sbErr) {
        // Table may not exist yet, use in-memory store
      }
    }

    return res.status(200).json({
      success: true,
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Fetch QR Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching QR settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/settings (Admin Only - Update Toggles)
// -----------------------------------------------------------------------------
router.post('/settings', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true, live_bill_pay_enabled: true };
    }

    const { user_qr_visible, qr_request_section_enabled, live_bill_pay_enabled } = req.body;

    if (user_qr_visible !== undefined) db.system_settings.user_qr_visible = Boolean(user_qr_visible);
    if (qr_request_section_enabled !== undefined) db.system_settings.qr_request_section_enabled = Boolean(qr_request_section_enabled);
    if (live_bill_pay_enabled !== undefined) db.system_settings.live_bill_pay_enabled = Boolean(live_bill_pay_enabled);

    if (supabase) {
      try {
        await supabase
          .from('system_settings')
          .upsert([{
            id: 'qr_controls',
            user_qr_visible: db.system_settings.user_qr_visible,
            qr_request_section_enabled: db.system_settings.qr_request_section_enabled,
            live_bill_pay_enabled: db.system_settings.live_bill_pay_enabled,
            updated_at: new Date().toISOString()
          }]);
      } catch (sbErr) {
        // Table or column in system_settings may not exist in Supabase schema, safe in-memory fallback
      }
    }

    return res.status(200).json({
      success: true,
      message: 'System QR controls updated successfully.',
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Update QR Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/request/submit (User Payment Submission)
// -----------------------------------------------------------------------------
router.post('/request/submit', verifyToken, async (req, res) => {
  try {
    if (db.system_settings && db.system_settings.qr_request_section_enabled === false) {
      return res.status(403).json({
        success: false,
        message: 'QR Payment Request submissions are currently disabled by Admin.'
      });
    }

    const { amount, utr_number, mobile_number, screenshot_url, qr_master_id } = req.body;
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount.' });
    }

    const cleanUtr = (utr_number || '').toString().trim();
    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({ success: false, message: 'UTR Number must be exactly 12 numeric digits.' });
    }

    // Check for duplicate UTR number in non-rejected requests
    const isDuplicateUtr = db.qr_payment_requests.some(
      r => r.utr_number === cleanUtr && r.status !== 'rejected'
    );
    if (isDuplicateUtr) {
      return res.status(400).json({ success: false, message: 'This 12-digit UTR number has already been submitted or processed.' });
    }

    const activeQr = db.qr_masters.find(q => q.id === qr_master_id) ||
                     db.qr_masters.find(q => q.is_selected && q.is_active) ||
                     db.qr_masters[0];

    const userChargePct = user.qr_charge_percent !== undefined ? parseFloat(user.qr_charge_percent) : 0;
    const chargeAmt = Math.round((numericAmount * (userChargePct / 100)) * 100) / 100;
    const netAmt = Math.round((numericAmount - chargeAmt) * 100) / 100;

    // Calculate Hierarchy Markup Commission
    let distUser = user.distributor_id ? db.users.find(u => u.id === user.distributor_id) : null;
    let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id)) 
      ? db.users.find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id))) 
      : null;

    const userRate = userChargePct;
    const distRate = distUser ? (parseFloat(distUser.qr_charge_percent) || 0) : 0;
    const superDistRate = superDistUser ? (parseFloat(superDistUser.qr_charge_percent) || 0) : 0;

    const dsMargin = distUser ? Math.max(0, userRate - distRate) : 0;
    const dsComm = distUser ? Math.round((numericAmount * (dsMargin / 100)) * 100) / 100 : 0;

    const msMargin = superDistUser ? Math.max(0, distRate - superDistRate) : 0;
    const msComm = superDistUser ? Math.round((numericAmount * (msMargin / 100)) * 100) / 100 : 0;
    const adminComm = Math.round(Math.max(0, chargeAmt - (dsComm + msComm)) * 100) / 100;

    const newRequest = {
      id: 'qr_req_' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      firm_name: user.firm_name,
      qr_master_id: activeQr ? activeQr.id : null,
      qr_name: activeQr ? activeQr.name : 'System QR',
      upi_id: activeQr ? activeQr.upi_id : '',
      amount: numericAmount,
      utr_number: cleanUtr,
      mobile_number: mobile_number || user.mobile_number,
      screenshot_url: screenshot_url || '',
      status: 'pending',
      charge_percent: userChargePct,
      charge_amount: chargeAmt,
      net_amount: netAmt,
      distributor_commission: dsComm,
      super_distributor_commission: msComm,
      admin_commission: adminComm,
      created_at: new Date().toISOString()
    };

    db.qr_payment_requests.unshift(newRequest);

    if (supabase) {
      try {
        const supabasePayload = {
          id: newRequest.id,
          user_id: newRequest.user_id,
          qr_master_id: newRequest.qr_master_id,
          amount: newRequest.amount,
          utr_number: newRequest.utr_number,
          mobile_number: newRequest.mobile_number,
          screenshot_url: newRequest.screenshot_url,
          status: newRequest.status,
          charge_percent: newRequest.charge_percent,
          charge_amount: newRequest.charge_amount,
          net_amount: newRequest.net_amount,
          distributor_commission: newRequest.distributor_commission,
          super_distributor_commission: newRequest.super_distributor_commission,
          created_at: newRequest.created_at
        };
        await supabase.from('qr_payment_requests').insert([supabasePayload]);
      } catch (sbErr) {
        console.error('Supabase Insert QR Request Error:', sbErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Payment request of ₹${numericAmount.toLocaleString('en-IN')} submitted successfully! Admin will verify UTR: ${cleanUtr}.`,
      payment_request: newRequest
    });
  } catch (error) {
    console.error('Submit Payment Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting payment request.' });
  }
});

// Alias /submit-payment-utr for backwards compatibility
router.post('/submit-payment-utr', verifyToken, async (req, res) => {
  const { amount, utr_number, mobile_number, screenshot_url, qr_id } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const cleanUtr = (utr_number || '').toString().trim();
  const numericAmount = parseFloat(amount);

  let distUser = user.distributor_id ? db.users.find(u => u.id === user.distributor_id) : null;
  let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id))
    ? db.users.find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id)))
    : null;
  const distRate = distUser ? (parseFloat(distUser.qr_charge_percent) || 0) : 0;
  const superDistRate = superDistUser ? (parseFloat(superDistUser.qr_charge_percent) || 0) : 0;
  const dsMargin = distUser ? Math.max(0, userChargePct - distRate) : 0;
  const msMargin = superDistUser ? Math.max(0, distRate - superDistRate) : 0;
  const dsComm = distUser ? Math.round((numericAmount * (dsMargin / 100)) * 100) / 100 : 0;
  const msComm = superDistUser ? Math.round((numericAmount * (msMargin / 100)) * 100) / 100 : 0;
  const adminComm = Math.round(Math.max(0, chargeAmt - (dsComm + msComm)) * 100) / 100;

  const newRequest = {
    id: 'qr_req_' + Date.now(),
    user_id: user.id,
    user_name: user.name,
    firm_name: user.firm_name,
    qr_master_id: activeQr ? activeQr.id : null,
    qr_name: activeQr ? activeQr.name : 'System QR',
    upi_id: activeQr ? activeQr.upi_id : '',
    amount: numericAmount,
    utr_number: cleanUtr,
    mobile_number: mobile_number || user.mobile_number,
    screenshot_url: screenshot_url || '',
    status: 'pending',
    charge_percent: userChargePct,
    charge_amount: chargeAmt,
    net_amount: netAmt,
    distributor_commission: dsComm,
    super_distributor_commission: msComm,
    admin_commission: adminComm,
    created_at: new Date().toISOString()
  };

  db.qr_payment_requests.unshift(newRequest);

  if (supabase) {
    try {
      const supabasePayload = {
        id: newRequest.id,
        user_id: newRequest.user_id,
        qr_master_id: newRequest.qr_master_id,
        amount: newRequest.amount,
        utr_number: newRequest.utr_number,
        mobile_number: newRequest.mobile_number,
        screenshot_url: newRequest.screenshot_url,
        status: newRequest.status,
        charge_percent: newRequest.charge_percent,
        charge_amount: newRequest.charge_amount,
        net_amount: newRequest.net_amount,
        distributor_commission: newRequest.distributor_commission,
        super_distributor_commission: newRequest.super_distributor_commission,
        created_at: newRequest.created_at
      };
      await supabase.from('qr_payment_requests').insert([supabasePayload]);
    } catch (sbErr) {
      console.error('Supabase Insert QR Request Error:', sbErr);
    }
  }

  return res.status(200).json({
    success: true,
    message: `Payment request of ₹${numericAmount} submitted successfully. Pending Admin Approval.`,
    payment_request: newRequest
  });
});

// -----------------------------------------------------------------------------
// GET /api/qr/request/list (Fetch Payment Requests - Lightweight & Ultra Fast)
// -----------------------------------------------------------------------------
router.get('/request/list', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('qr_payment_requests')
          .select('id, user_id, qr_master_id, amount, utr_number, mobile_number, status, charge_percent, charge_amount, net_amount, distributor_commission, super_distributor_commission, rejection_reason, processed_at, processed_by, created_at')
          .order('created_at', { ascending: false });

        if (!error && data) {
          db.qr_payment_requests = data.map(r => {
            const u = db.users.find(u => u.id === r.user_id);
            const q = db.qr_masters.find(qm => qm.id === r.qr_master_id);
            return {
              ...r,
              user_name: u ? u.name : (r.user_name || 'Retailer User'),
              firm_name: u ? u.firm_name : (r.firm_name || 'N/A'),
              qr_name: q ? q.name : (r.qr_name || 'Active QR'),
              upi_id: q ? q.upi_id : (r.upi_id || '')
            };
          });
        }
      } catch (err) {
        console.error('Supabase QR Request list fetch error:', err);
      }
    }

    let list = db.qr_payment_requests || [];

    if (user.role !== 'admin') {
      list = list.filter(r => r.user_id === user.id);
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      payment_requests: list
    });
  } catch (error) {
    console.error('Fetch Payment Requests Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment requests.' });
  }
});

// GET /api/qr/request/:id/screenshot (Fetch single screenshot on demand)
router.get('/request/:id/screenshot', verifyToken, async (req, res) => {
  try {
    const reqId = req.params.id;
    let screenshot_url = null;

    const memoryReq = db.qr_payment_requests.find(r => r.id === reqId || String(r.id) === String(reqId));
    if (memoryReq && memoryReq.screenshot_url) {
      screenshot_url = memoryReq.screenshot_url;
    } else if (supabase) {
      const { data } = await supabase.from('qr_payment_requests').select('screenshot_url').eq('id', reqId).maybeSingle();
      if (data) screenshot_url = data.screenshot_url;
    }

    return res.status(200).json({ success: true, screenshot_url });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch screenshot' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/request/:id/process (ATOMIC & IDEMPOTENT APPROVAL / REJECTION)
// Prevents Double Approval & Double Credit
// -----------------------------------------------------------------------------
router.post('/request/:id/process', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    const { action, rejection_reason } = req.body; // action: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approved" or "rejected".' });
    }

    // 1. STRICT IDEMPOTENCY & LOCK CHECK
    const targetReq = db.qr_payment_requests.find(r => r.id === reqId);
    if (!targetReq) {
      return res.status(404).json({ success: false, message: 'Payment request record not found.' });
    }

    if (targetReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${targetReq.status.toUpperCase()}! Double approval or credit prevented.`
      });
    }

    // 2. ATOMIC STATE CHANGE TO PREVENT RACE CONDITIONS
    targetReq.status = action;
    targetReq.processed_at = new Date().toISOString();
    targetReq.processed_by = req.user.id;

    if (action === 'rejected') {
      targetReq.rejection_reason = rejection_reason || 'Rejected by System Administrator';

      if (supabase) {
        try {
          await supabase.from('qr_payment_requests').update({
            status: 'rejected',
            rejection_reason: targetReq.rejection_reason,
            processed_at: targetReq.processed_at,
            processed_by: targetReq.processed_by
          }).eq('id', reqId);
        } catch (sbErr) {
          console.error('Supabase Reject Request Update Error:', sbErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Payment request ${reqId} rejected.`,
        payment_request: targetReq
      });
    }

    // 3. APPROVAL LOGIC: CREDIT WALLET & HIERARCHY COMMISSIONS
    const user = db.users.find(u => u.id === targetReq.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user account not found.' });
    }

    const chargePct = user.qr_charge_percent !== undefined ? parseFloat(user.qr_charge_percent) : (targetReq.charge_percent || 0);
    const chargeAmt = Math.round((targetReq.amount * (chargePct / 100)) * 100) / 100;
    const netCreditAmt = Math.round((targetReq.amount - chargeAmt) * 100) / 100;

    targetReq.charge_percent = chargePct;
    targetReq.charge_amount = chargeAmt;
    targetReq.net_amount = netCreditAmt;

    // ATOMIC WALLET INCREMENT
    user.wallet_balance += netCreditAmt;
    user.updated_at = new Date().toISOString();

    // HIERARCHY COMMISSION DISTRIBUTIONS (DS & MS BASED ON MARKUP SLAB)
    let distUser = user.distributor_id ? db.users.find(u => u.id === user.distributor_id) : null;
    let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id))
      ? db.users.find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id)))
      : null;

    const userRate = chargePct;
    const distRate = distUser ? (parseFloat(distUser.qr_charge_percent) || 0) : 0;
    const superDistRate = superDistUser ? (parseFloat(superDistUser.qr_charge_percent) || 0) : 0;

    const dsMargin = distUser ? Math.max(0, userRate - distRate) : 0;
    const dsComm = distUser ? Math.round((targetReq.amount * (dsMargin / 100)) * 100) / 100 : 0;

    const msMargin = superDistUser ? Math.max(0, distRate - superDistRate) : 0;
    const msComm = superDistUser ? Math.round((targetReq.amount * (msMargin / 100)) * 100) / 100 : 0;
    const adminComm = Math.round(Math.max(0, chargeAmt - (dsComm + msComm)) * 100) / 100;

    targetReq.distributor_commission = distUser ? dsComm : 0;
    targetReq.super_distributor_commission = superDistUser ? msComm : 0;
    targetReq.admin_commission = adminComm;

    if (distUser && dsComm > 0) {
      distUser.commission_balance = (distUser.commission_balance || 0) + dsComm;
      distUser.wallet_balance = (distUser.wallet_balance || 0) + dsComm; // Instantly available in wallet
      distUser.updated_at = new Date().toISOString();
    }

    if (superDistUser && msComm > 0) {
      superDistUser.commission_balance = (superDistUser.commission_balance || 0) + msComm;
      superDistUser.wallet_balance = (superDistUser.wallet_balance || 0) + msComm; // Instantly available in wallet
      superDistUser.updated_at = new Date().toISOString();
    }

    // Record Transaction Log
    const txRecord = {
      id: 'tx_qr_' + Date.now(),
      user_id: user.id,
      type: 'QR_ADD_MONEY',
      amount: targetReq.amount,
      service_charge: chargeAmt,
      net_amount: netCreditAmt,
      recipient_account: `UTR: ${targetReq.utr_number}`,
      recipient_name: 'QR Payment Request Approved',
      status: 'SUCCESS',
      reference_number: 'ASY-QR-' + Date.now().toString().slice(-8),
      created_at: new Date().toISOString()
    };
    db.transactions.unshift(txRecord);

    if (supabase) {
      try {
        await supabase.from('qr_payment_requests').update({
          status: 'approved',
          charge_percent: targetReq.charge_percent,
          charge_amount: targetReq.charge_amount,
          net_amount: targetReq.net_amount,
          distributor_commission: targetReq.distributor_commission || 0,
          super_distributor_commission: targetReq.super_distributor_commission || 0,
          processed_at: targetReq.processed_at,
          processed_by: targetReq.processed_by
        }).eq('id', reqId);

        // 1. Credit Retailer user wallet in Supabase
        await supabase.from('users_profiles').update({
          wallet_balance: user.wallet_balance,
          updated_at: user.updated_at
        }).eq('id', user.id);

        // 2. Credit Distributor wallet & commission balance in Supabase
        if (distUser && dsComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: distUser.wallet_balance,
            commission_balance: distUser.commission_balance,
            updated_at: distUser.updated_at
          }).eq('id', distUser.id);
        }

        // 3. Credit Super Distributor (Master Distributor) wallet & commission balance in Supabase
        if (superDistUser && msComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: superDistUser.wallet_balance,
            commission_balance: superDistUser.commission_balance,
            updated_at: superDistUser.updated_at
          }).eq('id', superDistUser.id);
        }
      } catch (sbErr) {
        console.error('Supabase Process Request Sync Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment Approved! ₹${netCreditAmt.toFixed(2)} credited to ${user.name}'s wallet (Charge: ${chargePct}% = ₹${chargeAmt.toFixed(2)}).`,
      payment_request: targetReq,
      updated_wallet: user.wallet_balance
    });
  } catch (error) {
    console.error('Process QR Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing payment request.' });
  }
});

// GET Settings endpoint
router.get('/settings', (req, res) => {
  return res.status(200).json({
    success: true,
    settings: { is_qr_enabled: true }
  });
});

export default router;
