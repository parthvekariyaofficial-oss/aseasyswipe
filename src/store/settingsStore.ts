import { create } from 'zustand';
import { b2bApi, payoutApi } from '../services/api';

interface SettingsState {
  liveBillPayEnabled: boolean;
  instantPayoutEnabled: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  fetchSettings: () => Promise<void>;
  setLiveBillPayEnabled: (enabled: boolean) => void;
  toggleLiveBillPay: () => Promise<{ success: boolean; message: string; enabled: boolean }>;
  setInstantPayoutEnabled: (enabled: boolean) => void;
  toggleInstantPayout: () => Promise<{ success: boolean; message: string; enabled: boolean }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const savedBill = typeof window !== 'undefined' ? localStorage.getItem('aseasy_live_bill_pay_enabled') : null;
  const initialBillEnabled = savedBill !== null ? savedBill === 'true' : true;

  const savedPayout = typeof window !== 'undefined' ? localStorage.getItem('aseasy_instant_payout_enabled') : null;
  const initialPayoutEnabled = savedPayout !== null ? savedPayout === 'true' : true;

  return {
    liveBillPayEnabled: initialBillEnabled,
    instantPayoutEnabled: initialPayoutEnabled,
    isLoading: false,
    isInitialized: false,

    fetchSettings: async () => {
      try {
        const [b2bRes, payoutRes] = await Promise.allSettled([
          b2bApi.getSettings(),
          payoutApi.getSettings()
        ]);

        if (b2bRes.status === 'fulfilled' && b2bRes.value?.success && b2bRes.value?.settings) {
          const enabled = b2bRes.value.settings.live_bill_pay_enabled !== false;
          if (typeof window !== 'undefined') {
            localStorage.setItem('aseasy_live_bill_pay_enabled', String(enabled));
          }
          set({ liveBillPayEnabled: enabled });
        }

        if (payoutRes.status === 'fulfilled' && payoutRes.value?.success && payoutRes.value?.settings) {
          const enabled = payoutRes.value.settings.instant_payout_enabled !== false;
          if (typeof window !== 'undefined') {
            localStorage.setItem('aseasy_instant_payout_enabled', String(enabled));
          }
          set({ instantPayoutEnabled: enabled });
        }

        set({ isInitialized: true });
      } catch {
        set({ isInitialized: true });
      }
    },

    setLiveBillPayEnabled: (enabled: boolean) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aseasy_live_bill_pay_enabled', String(enabled));
      }
      set({ liveBillPayEnabled: enabled });
    },

    toggleLiveBillPay: async () => {
      const current = get().liveBillPayEnabled;
      const nextVal = !current;

      get().setLiveBillPayEnabled(nextVal);
      set({ isLoading: true });

      try {
        const res = await b2bApi.updateSettings({ live_bill_pay_enabled: nextVal });
        if (res && res.success) {
          const finalVal = res.settings?.live_bill_pay_enabled !== false;
          get().setLiveBillPayEnabled(finalVal);
          return {
            success: true,
            message: res.message || `Live Bill Pay is now ${finalVal ? 'enabled' : 'disabled'}.`,
            enabled: finalVal
          };
        } else {
          get().setLiveBillPayEnabled(current);
          return {
            success: false,
            message: res?.message || 'Failed to update setting.',
            enabled: current
          };
        }
      } catch (err: any) {
        get().setLiveBillPayEnabled(current);
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Error communicating with server.',
          enabled: current
        };
      } finally {
        set({ isLoading: false });
      }
    },

    setInstantPayoutEnabled: (enabled: boolean) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aseasy_instant_payout_enabled', String(enabled));
      }
      set({ instantPayoutEnabled: enabled });
    },

    toggleInstantPayout: async () => {
      const current = get().instantPayoutEnabled;
      const nextVal = !current;

      get().setInstantPayoutEnabled(nextVal);
      set({ isLoading: true });

      try {
        const res = await payoutApi.updateSettings({ instant_payout_enabled: nextVal });
        if (res && res.success) {
          const finalVal = res.settings?.instant_payout_enabled !== false;
          get().setInstantPayoutEnabled(finalVal);
          return {
            success: true,
            message: res.message || `Instant Payout is now ${finalVal ? 'enabled' : 'disabled'}.`,
            enabled: finalVal
          };
        } else {
          get().setInstantPayoutEnabled(current);
          return {
            success: false,
            message: res?.message || 'Failed to update setting.',
            enabled: current
          };
        }
      } catch (err: any) {
        get().setInstantPayoutEnabled(current);
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Error communicating with server.',
          enabled: current
        };
      } finally {
        set({ isLoading: false });
      }
    }
  };
});
