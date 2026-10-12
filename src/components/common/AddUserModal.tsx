import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Camera, User, Mail, Phone, MapPin, 
  Building2, Shield, AlertCircle, CheckCircle2, Loader2,
  Copy, Check, Eye, EyeOff, Key
} from 'lucide-react';
import { userApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { UserProfile, UserRole } from '../../types/auth';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: () => void;
  distributors?: UserProfile[];
  allUsers?: UserProfile[];
  userToEdit?: UserProfile | null;
  defaultRole?: UserRole;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onUserAdded,
  distributors = [],
  allUsers = [],
  userToEdit = null,
  defaultRole = 'user'
}) => {
  const { user: currentUser } = useAuthStore();

  const targetDefaultRole = currentUser?.role === 'super_distributor'
    ? 'distributor'
    : currentUser?.role === 'distributor'
    ? 'user'
    : defaultRole;

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  
  const [homeAddress, setHomeAddress] = useState('');
  const [firmName, setFirmName] = useState('');
  const [firmAddress, setFirmAddress] = useState('');

  const [role, setRole] = useState<UserRole>(targetDefaultRole);
  const [assignedDistributorId, setAssignedDistributorId] = useState<string>('');
  const [qrChargePercent, setQrChargePercent] = useState<string>('0.50');

  const parentOptions = React.useMemo(() => {
    const usersList = allUsers.length > 0 ? allUsers : distributors;
    if (role === 'distributor') {
      return {
        label: 'ASSIGN TO MASTER DISTRIBUTOR (PARENT MS)',
        subtext: 'CHOOSE WHICH SUPER DISTRIBUTOR (MS) WILL MANAGE THIS DISTRIBUTOR.',
        list: usersList.filter(u => u.role === 'super_distributor')
      };
    }
    if (role === 'user') {
      return {
        label: 'ASSIGN TO DISTRIBUTOR (PARENT DS)',
        subtext: 'CHOOSE WHICH DISTRIBUTOR (DS) WILL MANAGE THIS RETAILER.',
        list: usersList.filter(u => u.role === 'distributor')
      };
    }
    return null;
  }, [allUsers, distributors, role]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createdCredentials, setCreatedCredentials] = useState<{
    user: UserProfile;
    generatedPassword: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        const parts = (userToEdit.name || '').trim().split(/\s+/);
        setFirstName(userToEdit.first_name || parts[0] || '');
        setMiddleName(userToEdit.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''));
        setLastName(userToEdit.last_name || (parts.length > 1 ? parts[parts.length - 1] : ''));
        setEmail(userToEdit.email || '');
        setMobileNumber(userToEdit.mobile_number || '');
        setHomeAddress(userToEdit.home_address || '');
        setFirmName(userToEdit.firm_name || '');
        setFirmAddress(userToEdit.firm_address || '');
        setRole(userToEdit.role || targetDefaultRole);
        setAssignedDistributorId(userToEdit.distributor_id || '');
        const chargeVal = userToEdit.qr_charge_percent !== undefined 
          ? userToEdit.qr_charge_percent 
          : (userToEdit.charge_percentage !== undefined ? userToEdit.charge_percentage : 0.50);
        setQrChargePercent(String(chargeVal));
        setPhotoPreview(userToEdit.profile_photo_url || null);
      } else {
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setEmail('');
        setMobileNumber('');
        setHomeAddress('');
        setFirmName('');
        setFirmAddress('');
        setRole(targetDefaultRole);
        setAssignedDistributorId('');
        setQrChargePercent('0.50');
        setPhotoPreview(null);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
      setCreatedCredentials(null);
      setShowCreatedPassword(false);
      setCopiedCredentials(false);
    }
  }, [isOpen, userToEdit, targetDefaultRole]);

  if (!isOpen) return null;

  if (createdCredentials) {
    const handleCopy = () => {
      const shareText = `🎉 *AsEasySwipe Account Credentials*\n\n` +
        `👤 *Name:* ${createdCredentials.user.name}\n` +
        `📱 *User ID / Mobile:* ${createdCredentials.user.mobile_number}\n` +
        `🔑 *Temporary Password:* ${createdCredentials.generatedPassword}\n` +
        `🏷️ *Role:* ${createdCredentials.user.role === 'super_distributor' ? 'Master Distributor (MS)' : createdCredentials.user.role === 'distributor' ? 'Distributor (DS)' : 'Retailer'}\n\n` +
        `🔐 *Note:* Mandatory password change required on first login.\n` +
        `🌐 *Portal:* ${window.location.origin}`;
      
      navigator.clipboard.writeText(shareText);
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2500);
    };

    const handleFinish = () => {
      setCreatedCredentials(null);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">User Account Created!</h3>
            <p className="text-xs text-slate-400">
              Copy the credentials below and send them to the user. First-time login will require a password change.
            </p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 uppercase font-sans text-[10px] font-bold">Account Name</span>
              <span className="text-white font-sans font-bold text-sm">{createdCredentials.user.name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 uppercase font-sans text-[10px] font-bold">User ID / Mobile</span>
              <span className="text-indigo-400 font-bold text-sm">{createdCredentials.user.mobile_number}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 uppercase font-sans text-[10px] font-bold">Account Role</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans text-xs font-bold uppercase border border-purple-500/30">
                {createdCredentials.user.role === 'super_distributor' ? 'Master Distributor (MS)' : createdCredentials.user.role === 'distributor' ? 'Distributor (DS)' : 'Retailer'}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-slate-400 uppercase font-sans text-[10px] font-bold block mb-1.5 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Generated 8-Digit Password</span>
              </span>
              <div className="flex items-center justify-between bg-slate-900 border border-indigo-500/40 rounded-xl px-4 py-2.5">
                <span className="text-emerald-400 font-mono font-bold text-base tracking-wider">
                  {showCreatedPassword ? createdCredentials.generatedPassword : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title={showCreatedPassword ? 'Hide password' : 'Show password'}
                >
                  {showCreatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                copiedCredentials 
                  ? 'bg-emerald-600 text-white shadow-emerald-950/50' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-indigo-950/50'
              }`}
            >
              {copiedCredentials ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Credentials Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Credentials (ID & Password)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700/50"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!firmName.trim()) {
      setErrorMessage('Firm Name is required.');
      return;
    }

    setLoading(true);

    try {
      const parsedCharge = parseFloat(qrChargePercent);
      const payload = {
        firstName,
        middleName,
        lastName,
        name: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
        email,
        mobile_number: mobileNumber,
        firm_name: firmName,
        home_address: homeAddress,
        firm_address: firmAddress,
        role,
        target_distributor_id: assignedDistributorId || null,
        qr_charge_percent: isNaN(parsedCharge) ? 0.50 : parsedCharge,
        charge_percentage: isNaN(parsedCharge) ? 0.50 : parsedCharge,
        profile_photo_url: photoPreview || ''
      };

      if (userToEdit) {
        const res = await userApi.updateUser(userToEdit.id, payload);
        if (res.success) {
          setSuccessMessage(res.message || 'User updated successfully!');
          if (onUserAdded) onUserAdded();
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setErrorMessage(res.message || 'Operation failed.');
        }
      } else {
        const res = await userApi.createSubuser(payload);
        if (res.success) {
          if (res.generatedPassword && res.user) {
            setCreatedCredentials({
              user: res.user,
              generatedPassword: res.generatedPassword
            });
            if (onUserAdded) onUserAdded();
          } else {
            setSuccessMessage(res.message || 'User registered successfully!');
            if (onUserAdded) onUserAdded();
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        } else {
          setErrorMessage(res.message || 'Operation failed.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error occurred while saving user details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER BAR */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/50"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {userToEdit ? 'Edit User Profile' : 'Add New User'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {userToEdit 
                  ? 'Update details for this user account.' 
                  : 'Fill in the details below to register a new user in the system.'}
              </p>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT CARD: PHOTO & PERSONAL DETAILS */}
            <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
              
              {/* UPLOAD PHOTO CONTAINER */}
              <div className="flex flex-col items-center justify-center pt-2 pb-1">
                <label className="relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-slate-700 group-hover:border-purple-500 bg-slate-900/80 flex flex-col items-center justify-center transition shadow-inner overflow-hidden relative">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                          <Camera className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-slate-200 tracking-wider">
                          UPLOAD PHOTO
                        </span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* FIRST NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  FIRST NAME <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER FIRST NAME"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* MIDDLE NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  MIDDLE NAME <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER MIDDLE NAME"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  LAST NAME <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER LAST NAME"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* EMAIL ADDRESS */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  EMAIL ADDRESS <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* MOBILE NUMBER */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  MOBILE NUMBER (10 DIGITS) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="1234567890"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: BUSINESS & ROLE DETAILS */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* CARD 1: ADDRESS & BUSINESS DETAILS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
                  <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Address & Business Details</h3>
                </div>

                {/* HOME ADDRESS */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    HOME ADDRESS <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="ENTER COMPLETE HOME ADDRESS"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                  />
                </div>

                {/* FIRM NAME */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    FIRM NAME <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ENTER FIRM NAME"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                {/* FIRM ADDRESS */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    FIRM ADDRESS <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="ENTER FIRM ADDRESS"
                    value={firmAddress}
                    onChange={(e) => setFirmAddress(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                  />
                </div>
              </div>

              {/* CARD 2: ROLE & ACCOUNT SETTINGS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
                  <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Role & Account Settings</h3>
                </div>

                {/* SELECT ROLE */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    SELECT ROLE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Shield className="w-4 h-4 text-slate-500" />
                    </div>
                    <select
                      value={role}
                      disabled={currentUser?.role === 'super_distributor' || currentUser?.role === 'distributor'}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition appearance-none cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                      {currentUser?.role === 'super_distributor' ? (
                        <option value="distributor">Distributor (DS)</option>
                      ) : currentUser?.role === 'distributor' ? (
                        <option value="user">Standard User (Retailer)</option>
                      ) : (
                        <>
                          <option value="user">Standard User (Retailer)</option>
                          <option value="distributor">Distributor (DS)</option>
                          <option value="super_distributor">Super Distributor (MS)</option>
                          <option value="admin">Super Admin HQ</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* DYNAMIC PARENT ASSIGNMENT - SHOWN FOR ADMIN */}
                {currentUser?.role === 'admin' && parentOptions && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      {parentOptions.label}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <select
                        value={assignedDistributorId}
                        onChange={(e) => setAssignedDistributorId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition appearance-none cursor-pointer"
                      >
                        <option value="">NONE (DIRECT UNDER ADMIN HQ)</option>
                        {parentOptions.list.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.firm_name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium uppercase tracking-tight">
                      {parentOptions.subtext}
                    </p>
                  </div>
                )}

                {/* DYNAMIC QR CHARGE (%) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    {role === 'distributor' 
                      ? 'DS QR CHARGE (%)' 
                      : role === 'super_distributor'
                      ? 'MS QR CHARGE (%)'
                      : 'RETAILER QR CHARGE (%)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.50"
                      value={qrChargePercent}
                      onChange={(e) => setQrChargePercent(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      %
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium uppercase tracking-tight">
                    {role === 'distributor' 
                      ? 'SET QR RATE SLAB FOR THIS DISTRIBUTOR. PROFIT MARGIN IS CALCULATED FROM THIS RATE.' 
                      : role === 'super_distributor'
                      ? 'SET QR RATE SLAB FOR THIS MASTER DISTRIBUTOR.'
                      : 'PERCENTAGE CHARGE DEDUCTED FROM THIS RETAILER\'S PAYMENTS UPON APPROVAL.'}
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{userToEdit ? 'Saving Changes...' : 'Registering User...'}</span>
                </>
              ) : (
                <span>{userToEdit ? 'Save / Update User' : 'Submit / Register User'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
