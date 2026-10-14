import axios from 'axios';
import type { AuthResponse, UserProfile } from '../types/auth';
export { supabase } from '../lib/supabase';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('aseasy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.response.data?.code === 'TOKEN_EXPIRED') {
        localStorage.removeItem('aseasy_token');
        localStorage.removeItem('aseasy_user');
        window.dispatchEvent(new Event('aseasy_session_expired'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { mobile_number: string; password?: string; mpin?: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  verifyTpin: async (tpin: string): Promise<{ success: boolean; message: string; isLocked?: boolean; attemptsLeft?: number; remainingSeconds?: number }> => {
    const response = await apiClient.post('/auth/verify-tpin', { tpin });
    return response.data;
  },

  changePassword: async (data: { oldPassword?: string; newPassword: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  createMpin: async (mpin: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/create-mpin', { mpin });
    return response.data;
  },

  createTpin: async (tpin: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/create-tpin', { tpin });
    return response.data;
  },

  requestOtp: async (data: { purpose: string; channel: 'WHATSAPP' | 'SMS' }): Promise<{ success: boolean; message: string; demoOtpCode?: string }> => {
    const response = await apiClient.post('/auth/request-otp', data);
    return response.data;
  },

  resetTpin: async (data: { 
    newTpin: string; 
    verificationType?: 'old_tpin' | 'mpin' | 'password';
    verificationValue?: string;
    otpCode?: string;
  }): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const response = await apiClient.post('/auth/reset-tpin', data);
    return response.data;
  },

  resetMpin: async (data: { otpCode: string; newMpin: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/reset-mpin', data);
    return response.data;
  },
};

export const userApi = {
  getProfile: async (): Promise<{ success: boolean; user: UserProfile }> => {
    const response = await apiClient.get('/user/me');
    return response.data;
  },

  getHierarchy: async (): Promise<{ success: boolean; users: UserProfile[]; role: string }> => {
    const response = await apiClient.get('/user/hierarchy');
    return response.data;
  },

  updateStatus: async (data: { targetUserId: string; newStatus?: string; walletAdjustAmount?: number }): Promise<{ success: boolean; message: string; user: UserProfile }> => {
    const response = await apiClient.patch('/user/status', data);
    return response.data;
  },

  createSubuser: async (data: Partial<UserProfile>): Promise<{ success: boolean; message: string; user: UserProfile; generatedPassword?: string }> => {
    const response = await apiClient.post('/user/create-subuser', data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/user/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<UserProfile>): Promise<{ success: boolean; message: string; user: UserProfile }> => {
    const response = await apiClient.put(`/user/${id}`, data);
    return response.data;
  },
};

export const qrApi = {
  getQrList: async () => {
    const response = await apiClient.get('/qr/master/list');
    return response.data;
  },

  createQrMaster: async (data: any) => {
    const response = await apiClient.post('/qr/master/create', data);
    return response.data;
  },

  updateQrMaster: async (id: string, data: any) => {
    const response = await apiClient.put(`/qr/master/${id}`, data);
    return response.data;
  },

  deleteQrMaster: async (id: string) => {
    const response = await apiClient.delete(`/qr/master/${id}`);
    return response.data;
  },

  toggleQrStatus: async (id: string) => {
    const response = await apiClient.patch(`/qr/master/${id}/toggle`);
    return response.data;
  },

  selectActiveQr: async (id: string) => {
    const response = await apiClient.post(`/qr/master/${id}/select`);
    return response.data;
  },

  getActiveQr: async () => {
    const response = await apiClient.get('/qr/active');
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/qr/settings');
    return response.data;
  },

  updateSettings: async (data: { user_qr_visible?: boolean; qr_request_section_enabled?: boolean }) => {
    const response = await apiClient.post('/qr/settings', data);
    return response.data;
  },

  submitPaymentRequest: async (data: { amount: number; utr_number: string; mobile_number?: string; screenshot_url?: string; qr_master_id?: string }) => {
    const response = await apiClient.post('/qr/request/submit', data);
    return response.data;
  },

  getPaymentRequests: async () => {
    const response = await apiClient.get('/qr/request/list');
    return response.data;
  },

  getScreenshot: async (id: string) => {
    const response = await apiClient.get(`/qr/request/${id}/screenshot`);
    return response.data;
  },

  processPaymentRequest: async (id: string, action: 'approved' | 'rejected', rejection_reason?: string) => {
    const response = await apiClient.post(`/qr/request/${id}/process`, { action, rejection_reason });
    return response.data;
  },
};

export const bankApi = {
  getBankList: async () => {
    const response = await apiClient.get('/bank/list');
    return response.data;
  },

  createBank: async (data: any) => {
    const response = await apiClient.post('/bank/create', data);
    return response.data;
  },

  updateBank: async (id: string, data: any) => {
    const response = await apiClient.put(`/bank/${id}`, data);
    return response.data;
  },

  toggleBankStatus: async (id: string) => {
    const response = await apiClient.patch(`/bank/${id}/toggle`);
    return response.data;
  },

  deleteBank: async (id: string) => {
    const response = await apiClient.delete(`/bank/${id}`);
    return response.data;
  },
};

export const billApi = {
  getBills: async (params?: any) => {
    const response = await apiClient.get('/bills/submissions', { params });
    return response.data;
  },
  getSubmissions: async (params?: any) => {
    const response = await apiClient.get('/bills/submissions', { params });
    return response.data;
  },
  updateStatus: async (id: string, data: any) => {
    const response = await apiClient.patch(`/bills/submissions/${id}/status`, data);
    return response.data;
  },
  claimBill: async (id: string) => {
    const response = await apiClient.post(`/bills/submissions/${id}/claim`);
    return response.data;
  },
  approveBill: async (idOrData: any, data?: any) => {
    const id = typeof idOrData === 'object' ? idOrData.bill_id : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const response = await apiClient.post(`/bills/submissions/${id}/approve`, body);
    return response.data;
  },
  rejectBill: async (idOrData: any, data?: any) => {
    const id = typeof idOrData === 'object' ? idOrData.bill_id : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const response = await apiClient.post(`/bills/submissions/${id}/reject`, body);
    return response.data;
  },
};

export const billRequestApi = {
  getSlabs: async () => {
    const response = await apiClient.get('/bill-request/slabs');
    return response.data;
  },

  createSlab: async (data: { min_amount: number; max_amount: number; charge_amount: number }) => {
    const response = await apiClient.post('/bill-request/slabs', data);
    return response.data;
  },

  deleteSlab: async (id: string) => {
    const response = await apiClient.delete(`/bill-request/slabs/${id}`);
    return response.data;
  },

  submitRequest: async (data: {
    customer_name: string;
    card_number: string;
    bank_name: string;
    amount: number;
    mobile_number: string;
  }) => {
    const response = await apiClient.post('/bill-request/submit', data);
    return response.data;
  },

  getRequests: async () => {
    const response = await apiClient.get('/bill-request/list');
    return response.data;
  },

  processRequest: async (id: string, action: 'approved' | 'rejected', rejection_reason?: string) => {
    const response = await apiClient.post(`/bill-request/${id}/process`, { action, rejection_reason });
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/bill-request/settings');
    return response.data;
  },

  updateSettings: async (data: { cc_bill_pay_enabled: boolean }) => {
    const response = await apiClient.post('/bill-request/settings', data);
    return response.data;
  }
};

export const b2bApi = {
  getUsepayBalance: async () => {
    const response = await apiClient.get('/b2b/usepay-balance');
    return response.data;
  },

  saveUsepaySettings: async (data: { apiKey?: string; secretKey?: string; baseUrl?: string }) => {
    const response = await apiClient.post('/b2b/usepay-settings', data);
    return response.data;
  },

  getCredentials: async () => {
    const response = await apiClient.get('/b2b/credentials');
    return response.data;
  },

  // BBPS Live Bill Payment APIs
  getCategories: async () => {
    const response = await apiClient.get('/b2b/categories');
    return response.data;
  },

  getBillers: async (params?: { category_id?: number | string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/b2b/billers', { params });
    return response.data;
  },

  fetchBill: async (payload: { billerId: string; mobile: string; customerParams: { name: string; value: string }[] }) => {
    const response = await apiClient.post('/b2b/fetch-bill', payload);
    return response.data;
  },

  payBill: async (payload: {
    billerId: string;
    amount: number;
    mobile: string;
    paymentMode?: string;
    client_transaction_id?: string;
    fetchRequestId?: string;
    customerParams: { name: string; value: string }[];
    billerResponseInfo?: any;
    additionalInfo?: any;
    customerPan?: string;
  }) => {
    const response = await apiClient.post('/b2b/pay-bill', payload);
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get('/b2b/history');
    return response.data;
  },

  checkStatus: async (transaction_id: string) => {
    const response = await apiClient.get(`/b2b/status/${encodeURIComponent(transaction_id)}`);
    return response.data;
  },

  calculateCharge: async (amount: number) => {
    const response = await apiClient.get('/b2b/calculate-charge', { params: { amount } });
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/b2b/settings');
    return response.data;
  },

  updateSettings: async (data: { live_bill_pay_enabled: boolean }) => {
    const response = await apiClient.post('/b2b/settings', data);
    return response.data;
  }
};

import type { PayoutSlab, PayoutTransferPayload, PayoutTransaction } from '../types/payout';

export const payoutApi = {
  getSlabs: async (): Promise<{ success: boolean; slabs: PayoutSlab[] }> => {
    const response = await apiClient.get('/payout/slabs');
    return response.data;
  },

  createSlab: async (data: Partial<PayoutSlab>): Promise<{ success: boolean; message: string; slab: PayoutSlab }> => {
    const response = await apiClient.post('/payout/slabs', data);
    return response.data;
  },

  updateSlab: async (id: string, data: Partial<PayoutSlab>): Promise<{ success: boolean; message: string; slab: PayoutSlab }> => {
    const response = await apiClient.put(`/payout/slabs/${id}`, data);
    return response.data;
  },

  deleteSlab: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/payout/slabs/${id}`);
    return response.data;
  },

  calculateCharge: async (amount: number): Promise<{ success: boolean; amount: number; charge_amount: number; total_deducted: number; slab: PayoutSlab | null }> => {
    const response = await apiClient.post('/payout/calculate-charge', { amount });
    return response.data;
  },

  transfer: async (payload: PayoutTransferPayload): Promise<{
    success: boolean;
    message: string;
    data?: any;
    refunded?: boolean;
  }> => {
    const response = await apiClient.post('/payout/transfer', payload);
    return response.data;
  },

  checkStatus: async (orderId: string): Promise<{ success: boolean; data: any; localRecord?: any }> => {
    const response = await apiClient.get(`/payout/status/${encodeURIComponent(orderId)}`);
    return response.data;
  },

  getHistory: async (): Promise<{ success: boolean; transactions: PayoutTransaction[] }> => {
    const response = await apiClient.get('/payout/history');
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/payout/settings');
    return response.data;
  },

  updateSettings: async (data: { instant_payout_enabled: boolean }) => {
    const response = await apiClient.post('/payout/settings', data);
    return response.data;
  }
};

import type { AccountStatement, StatementFilterParams } from '../types/statement';

export const statementApi = {
  getUserStatement: async (params?: StatementFilterParams): Promise<{ success: boolean; statement: AccountStatement }> => {
    const response = await apiClient.get('/statement/user', { params });
    return response.data;
  },

  getAdminStatement: async (params?: StatementFilterParams): Promise<{ success: boolean; statement: AccountStatement }> => {
    const response = await apiClient.get('/statement/admin', { params });
    return response.data;
  },

  getUsersList: async (): Promise<{ success: boolean; users: any[] }> => {
    const response = await apiClient.get('/statement/users-list');
    return response.data;
  }
};

export const kycApi = {
  submitKyc: async (data: {
    pan_card_url: string;
    aadhaar_front_url: string;
    aadhaar_back_url: string;
    firm_selfie_url: string;
    cheque_url: string;
  }) => {
    const response = await apiClient.post('/kyc/submit', data);
    return response.data;
  },

  getMyKycStatus: async () => {
    const response = await apiClient.get('/kyc/my-status');
    return response.data;
  },

  getAdminKycRequests: async () => {
    const response = await apiClient.get('/kyc/admin/requests');
    return response.data;
  },

  reviewKycRequest: async (data: {
    kyc_id?: string;
    user_id: string;
    action: 'approve' | 'reject';
    rejection_reason?: string;
  }) => {
    const response = await apiClient.post('/kyc/admin/action', data);
    return response.data;
  }
};







