import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/bank/list - Fetch all bank entries
router.get('/list', verifyToken, async (req, res) => {
  try {
    let bankList = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bank_accounts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          bankList = data;
          db.banks = bankList;
        }
      } catch (e) {
        bankList = db.banks || [];
      }
    } else {
      bankList = db.banks || [];
    }

    return res.status(200).json({
      success: true,
      banks: bankList
    });
  } catch (err) {
    console.error('Fetch Bank List Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bank list' });
  }
});

// POST /api/bank/create - Create a new bank entry (Only Bank Name & Status)
router.post('/create', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { bank_name, is_active } = req.body;

    if (!bank_name || !bank_name.trim()) {
      return res.status(400).json({ success: false, message: 'Bank Name is required' });
    }

    const newBank = {
      id: `bnk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      bank_name: bank_name.trim(),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: new Date().toISOString()
    };

    // Always insert into in-memory store so it shows immediately
    if (!db.banks) db.banks = [];
    db.banks.unshift(newBank);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bank_accounts')
          .insert([newBank])
          .select('*')
          .single();

        if (error) {
          console.warn('Supabase bank create notice:', error.message);
        } else if (data) {
          const idx = db.banks.findIndex(b => b.id === newBank.id);
          if (idx !== -1) db.banks[idx] = data;
        }
      } catch (err) {
        console.warn('Supabase DB Exception:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Bank entry created successfully!',
      bank: newBank
    });
  } catch (err) {
    console.error('Create Bank Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create bank entry' });
  }
});

// PUT /api/bank/:id - Update bank entry (Only Bank Name & Status)
router.put('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, is_active } = req.body;

    const bankIndex = (db.banks || []).findIndex(b => b.id === id);
    if (bankIndex === -1) {
      return res.status(404).json({ success: false, message: 'Bank entry not found' });
    }

    const updatedBank = {
      ...db.banks[bankIndex],
      ...(bank_name !== undefined && { bank_name: bank_name.trim() }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      updated_at: new Date().toISOString()
    };

    db.banks[bankIndex] = updatedBank;

    if (supabase) {
      try {
        await supabase
          .from('bank_accounts')
          .update({
            ...(bank_name !== undefined && { bank_name: bank_name.trim() }),
            ...(is_active !== undefined && { is_active: Boolean(is_active) }),
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      } catch (e) {
        // Silent catch
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bank entry updated successfully!',
      bank: updatedBank
    });
  } catch (err) {
    console.error('Update Bank Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update bank entry' });
  }
});

// PATCH /api/bank/:id/toggle - Toggle On/Off status
router.patch('/:id/toggle', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const bankIndex = (db.banks || []).findIndex(b => b.id === id);
    if (bankIndex === -1) {
      return res.status(404).json({ success: false, message: 'Bank entry not found' });
    }

    const newActiveState = !db.banks[bankIndex].is_active;
    db.banks[bankIndex].is_active = newActiveState;
    db.banks[bankIndex].updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('bank_accounts')
          .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        // Silent catch
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bank status changed to ${newActiveState ? 'Active' : 'Inactive'}`,
      bank: db.banks[bankIndex]
    });
  } catch (err) {
    console.error('Toggle Bank Status Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle bank status' });
  }
});

// DELETE /api/bank/:id - Delete bank entry
router.delete('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const bankIndex = (db.banks || []).findIndex(b => b.id === id);

    let deletedBank = null;
    if (bankIndex !== -1) {
      deletedBank = db.banks.splice(bankIndex, 1)[0];
    }

    if (supabase) {
      try {
        await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', id);
      } catch (e) {
        // Silent catch
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bank entry deleted successfully!',
      bank: deletedBank || { id }
    });
  } catch (err) {
    console.error('Delete Bank Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete bank entry' });
  }
});

export default router;
