import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles, sanitizeUser } from '../middleware/auth.js';

const router = express.Router();

if (!db.kyc_verifications) {
  db.kyc_verifications = [];
}

// -----------------------------------------------------------------------------
// POST /api/kyc/submit
// User submits KYC documents (PAN, Aadhaar Front & Back, Firm Selfie, Cheque)
// -----------------------------------------------------------------------------
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      pan_card_url, 
      aadhaar_front_url, 
      aadhaar_back_url, 
      firm_selfie_url, 
      cheque_url 
    } = req.body;

    if (!pan_card_url || !aadhaar_front_url || !aadhaar_back_url || !firm_selfie_url || !cheque_url) {
      return res.status(400).json({
        success: false,
        message: 'All 5 KYC documents (PAN Card, Aadhaar Front, Aadhaar Back, Firm Selfie, Cheque/Passbook) are strictly required.'
      });
    }

    const newKycId = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const kycRecord = {
      id: newKycId,
      user_id: userId,
      pan_card_url,
      aadhaar_front_url,
      aadhaar_back_url,
      firm_selfie_url,
      cheque_url,
      status: 'under_review',
      rejection_reason: null,
      submitted_at: nowIso,
      reviewed_at: null,
      reviewed_by: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    // Store in-memory
    db.kyc_verifications = db.kyc_verifications.filter(k => k.user_id !== userId);
    db.kyc_verifications.unshift(kycRecord);

    // Update user in memory
    let updatedUser = null;
    const userIdx = (db.users || []).findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      db.users[userIdx].kyc_status = 'under_review';
      db.users[userIdx].kyc_rejection_reason = null;
      db.users[userIdx].updated_at = nowIso;
      updatedUser = db.users[userIdx];
    } else {
      req.user.kyc_status = 'under_review';
      req.user.kyc_rejection_reason = null;
      updatedUser = req.user;
    }

    // Sync to Supabase PostgreSQL
    if (supabase) {
      try {
        await supabase.from('kyc_verifications').upsert([kycRecord]);
        const { data: sbUser } = await supabase
          .from('users_profiles')
          .update({
            kyc_status: 'under_review',
            kyc_rejection_reason: null,
            updated_at: nowIso
          })
          .eq('id', userId)
          .select()
          .maybeSingle();

        if (sbUser) {
          updatedUser = sbUser;
        }
      } catch (sbErr) {
        console.error('Supabase KYC Submit Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'KYC documents submitted successfully! Your account is now under review.',
      kyc: kycRecord,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('KYC Submit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit KYC documents: ' + (error.message || 'Server Error')
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/kyc/my-status
// Returns active KYC status and latest submitted record for current user
// -----------------------------------------------------------------------------
router.get('/my-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let kycRecord = db.kyc_verifications.find(k => k.user_id === userId);

    if (supabase) {
      try {
        const { data } = await supabase
          .from('kyc_verifications')
          .select('*')
          .eq('user_id', userId)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          kycRecord = data;
        }
      } catch (sbErr) {
        console.error('Supabase KYC Status Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      kyc_status: req.user.kyc_status || 'not_submitted',
      rejection_reason: req.user.kyc_rejection_reason || null,
      kyc: kycRecord || null
    });
  } catch (error) {
    console.error('KYC Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch KYC status.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/kyc/admin/requests
// Admin fetches all KYC submissions with user profile information
// -----------------------------------------------------------------------------
router.get('/admin/requests', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    let list = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('kyc_verifications')
          .select(`
            *,
            users_profiles (
              id,
              name,
              firm_name,
              mobile_number,
              email,
              role,
              status,
              created_at
            )
          `)
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          list = data.map(item => ({
            ...item,
            user: item.users_profiles || null
          }));
        }
      } catch (sbErr) {
        console.error('Supabase Admin KYC Fetch Error:', sbErr);
      }
    }

    // Fallback or merge with in-memory if Supabase is offline or empty
    if (list.length === 0 && db.kyc_verifications.length > 0) {
      list = db.kyc_verifications.map(item => {
        const user = (db.users || []).find(u => u.id === item.user_id);
        return {
          ...item,
          user: user ? sanitizeUser(user) : null
        };
      });
    }

    return res.status(200).json({
      success: true,
      requests: list
    });
  } catch (error) {
    console.error('Admin KYC Requests Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch KYC requests.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/kyc/admin/action
// Admin approves or rejects a user's KYC submission
// -----------------------------------------------------------------------------
router.post('/admin/action', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { kyc_id, user_id, action, rejection_reason } = req.body;

    if (!user_id || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: user_id and action (approve / reject) are required.'
      });
    }

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting KYC.'
      });
    }

    const nextKycStatus = action === 'approve' ? 'verified' : 'rejected';
    const nowIso = new Date().toISOString();

    // 1. Update in-memory user
    const userIdx = (db.users || []).findIndex(u => u.id === user_id);
    if (userIdx !== -1) {
      db.users[userIdx].kyc_status = nextKycStatus;
      db.users[userIdx].kyc_rejection_reason = action === 'reject' ? rejection_reason : null;
      db.users[userIdx].updated_at = nowIso;
    }

    // 2. Update in-memory kyc_verifications
    const kycIdx = (db.kyc_verifications || []).findIndex(k => k.id === kyc_id || k.user_id === user_id);
    if (kycIdx !== -1) {
      db.kyc_verifications[kycIdx].status = nextKycStatus;
      db.kyc_verifications[kycIdx].rejection_reason = action === 'reject' ? rejection_reason : null;
      db.kyc_verifications[kycIdx].reviewed_at = nowIso;
      db.kyc_verifications[kycIdx].reviewed_by = req.user.id;
      db.kyc_verifications[kycIdx].updated_at = nowIso;
    }

    // 3. Update Supabase
    if (supabase) {
      try {
        await supabase
          .from('users_profiles')
          .update({
            kyc_status: nextKycStatus,
            kyc_rejection_reason: action === 'reject' ? rejection_reason : null,
            updated_at: nowIso
          })
          .eq('id', user_id);

        if (kyc_id) {
          await supabase
            .from('kyc_verifications')
            .update({
              status: nextKycStatus,
              rejection_reason: action === 'reject' ? rejection_reason : null,
              reviewed_at: nowIso,
              reviewed_by: req.user.id,
              updated_at: nowIso
            })
            .eq('id', kyc_id);
        } else {
          await supabase
            .from('kyc_verifications')
            .update({
              status: nextKycStatus,
              rejection_reason: action === 'reject' ? rejection_reason : null,
              reviewed_at: nowIso,
              reviewed_by: req.user.id,
              updated_at: nowIso
            })
            .eq('user_id', user_id);
        }
      } catch (sbErr) {
        console.error('Supabase KYC Admin Action Error:', sbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: action === 'approve' ? 'KYC approved successfully! User can now access dashboard.' : 'KYC rejected. User can re-upload documents.',
      kyc_status: nextKycStatus
    });
  } catch (error) {
    console.error('Admin KYC Action Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process KYC action.' });
  }
});

export default router;
