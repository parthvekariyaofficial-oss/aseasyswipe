import { create } from 'zustand';
import { b2bApi } from '../services/api';

interface SettingsState {
  liveBillPayEnabled: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  fetchSettings: () => Promise<void>;
  setLiveBillPayEnabled: (enabled: boolean) => void;
  toggleLiveBillPay: () => Promise<{ success: boolean; message: string; enabled: boolean }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('aseasy_live_bill_pay_enabled') : null;
  const initialEnabled = saved !== null ? saved === 'true' : true;

  return {
    liveBillPayEnabled: initialEnabled,
    isLoading: false,
    isInitialized: false,

    fetchSettings: async () => {
      try {
        const res = await b2bApi.getSettings();
        if (res && res.success && res.settings) {
          const enabled = res.settings.live_bill_pay_enabled !== false;
          if (typeof window !== 'undefined') {
            localStorage.setItem('aseasy_live_bill_pay_enabled', String(enabled));
          }
          set({ liveBillPayEnabled: enabled, isInitialized: true });
        }
      } catch {
        // Keep current state on error
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

      // Optimistic update
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
          // Revert
          get().setLiveBillPayEnabled(current);
          return {
            success: false,
            message: res?.message || 'Failed to update setting.',
            enabled: current
          };
        }
      } catch (err: any) {
        // Revert
        get().setLiveBillPayEnabled(current);
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
