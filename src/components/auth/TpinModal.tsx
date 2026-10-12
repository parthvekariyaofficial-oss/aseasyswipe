import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, AlertTriangle, X, RefreshCw, Key } from 'lucide-react';
import { authApi } from '../../services/api';

interface TpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tpinCode: string) => void;
  title?: string;
  subtitle?: string;
  onOpenResetOtp?: () => void;
}

export const TpinModal: React.FC<TpinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'TPIN Transaction Verification',
  subtitle = 'Enter your 4-Digit Security TPIN to authorize this operation',
  onOpenResetOtp
}) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setErrorMessage(null);
      setIsLocked(false);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);
    setErrorMessage(null);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (char && index === 3) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyPinCode(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const verifyPinCode = async (pinString: string) => {
    setLoading(true);
    setErrorMessage(null);
    setIsShake(false);

    try {
      const res = await authApi.verifyTpin(pinString);
      if (res.success) {
        onSuccess(pinString);
        onClose();
      } else {
        triggerShakeError(res.message || 'Invalid TPIN');
        if (res.isLocked) {
          setIsLocked(true);
        }
        if (res.attemptsLeft !== undefined) {
          setAttemptsLeft(res.attemptsLeft);
        }
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        if (data.isLocked) {
          setIsLocked(true);
        }
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        triggerShakeError(data.message || 'TPIN Verification Failed');
      } else {
        triggerShakeError('Network error verifying TPIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerShakeError = (msg: string) => {
    setErrorMessage(msg);
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`max-w-sm w-full glass-panel rounded-3xl p-6 border border-indigo-500/30 shadow-2xl relative ${isShake ? 'animate-shake' : ''}`}>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/40">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {isLocked ? (
          <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 text-center mb-4 space-y-2">
            <AlertTriangle className="w-7 h-7 text-red-400 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-red-200">TPIN Account Security Locked!</p>
            <p className="text-[11px] text-slate-300">
              3 consecutive invalid entries detected. TPIN transactions locked for 15 minutes.
            </p>
            {onOpenResetOtp && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResetOtp();
                }}
                className="mt-2 text-xs text-amber-300 hover:text-amber-200 underline font-semibold flex items-center justify-center gap-1 mx-auto"
              >
                <Key className="w-3.5 h-3.5" /> Reset TPIN via WhatsApp OTP
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-center space-x-3 my-6">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="password"
                  maxLength={1}
                  value={digit}
                  disabled={loading}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 rounded-xl text-center font-mono font-extrabold text-2xl glass-input ${
                    errorMessage ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-indigo-500/40 text-white'
                  }`}
                />
              ))}
            </div>

            {errorMessage && (
              <div className="text-center mb-4 space-y-1">
                <p className="text-xs font-semibold text-red-400">{errorMessage}</p>
                {attemptsLeft !== null && (
                  <p className="text-[11px] text-amber-300 font-mono">
                    Warning: {attemptsLeft} attempt(s) remaining before 15-min lock
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => verifyPinCode(pin.join(''))}
              disabled={loading || pin.join('').length !== 4}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Financial Request</span>
                </>
              )}
            </button>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center flex items-center justify-between text-[11px] text-slate-400">
              <span>Demo TPIN: <strong className="text-indigo-300 font-mono">1234</strong></span>
              {onOpenResetOtp && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenResetOtp();
                  }}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Forgot TPIN?
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
