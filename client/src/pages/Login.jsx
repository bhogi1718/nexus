import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { generateKeypair, storeKeys, getKeys } from '../services/cryptoService';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/ui/Icon';
import { ShaderBackground } from '../components/ShaderBackground';

const OTP_LENGTH = 6;

export const Login = () => {
  const [step, setStep] = useState(1); // 1: email entry, 2: otp verification
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const otpInputRefs = useRef([]);

  const otp = otpDigits.join('');

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/send-otp-login', { email });
      setStep(2);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp-login', {
        email,
        otp
      });
      // Update auth context so ProtectedRoute lets us through immediately
      const { accessToken, refreshToken } = response.data;
      loginWithToken(accessToken, refreshToken, response.data.user);

      // Restore encryption keys: server is the source of truth so messages
      // decrypt on any device/session. Only generate if the server has none.
      const serverUser = response.data.user;
      if (serverUser.publicKey && serverUser.secretKey) {
        storeKeys(serverUser.publicKey, serverUser.secretKey);
      } else {
        let keys = getKeys();
        if (!keys.secretKey || !keys.publicKey) {
          keys = generateKeypair();
          storeKeys(keys.publicKey, keys.secretKey);
        }
        try {
          await api.post('/auth/update-public-key', {
            publicKey: keys.publicKey,
            secretKey: keys.secretKey
          });
        } catch (updateErr) {
          console.warn('Failed to sync keys to server:', updateErr.message);
        }
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <ShaderBackground />

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-xl animate-fade-in-up">
          <div className="w-16 h-16 bg-primary-container rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-md">
            <Icon name="forum" filled className="text-on-primary-container text-4xl" />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Nexus</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Welcome back</p>
        </div>

        <div className="auth-card">
          {error && (
            <div className="mb-lg p-md bg-error-container/20 border border-error/20 text-error rounded-lg flex items-start gap-sm">
              <Icon name="error" className="text-[20px] mt-0.5 flex-shrink-0" />
              <span className="font-body-sm text-body-sm">{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-md">
              <div className="group">
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs ml-1">Email Address</label>
                <div className="relative">
                  <Icon name="alternate_email" className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input pl-12"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="auth-button mt-lg">
                {loading ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[20px]" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Authorize Session
                    <Icon name="arrow_forward" className="text-[20px]" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTPAndLogin}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="text-primary hover:text-primary/80 flex items-center gap-xs mb-sm font-label-caps text-label-caps transition-colors"
              >
                <Icon name="chevron_left" className="text-[16px]" />
                Back
              </button>
              <div className="mb-lg">
                <h2 className="font-headline-md text-headline-md mb-xs text-on-surface">Verification Code</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  A 6-digit code was sent to <strong>{email}</strong>
                </p>
              </div>

              <div className="flex justify-between gap-sm mb-lg">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    maxLength={1}
                    inputMode="numeric"
                    className="otp-input w-12 h-14 text-center bg-surface-container-high border border-outline-variant rounded-lg text-primary font-headline-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                ))}
              </div>

              <button type="submit" disabled={loading || otp.length < OTP_LENGTH} className="auth-button">
                {loading ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[20px]" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Sign In
                    <Icon name="verified_user" className="text-[20px]" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-lg pt-lg border-t border-outline-variant/30 text-center">
            <span className="text-on-surface-variant font-body-sm text-body-sm">Don't have an account? </span>
            <Link to="/signup" className="font-bold text-primary hover:underline">Sign Up</Link>
          </div>
        </div>

        <footer className="mt-xl text-center opacity-60">
          <p className="font-body-sm text-body-sm flex items-center justify-center gap-xs text-on-surface-variant">
            <Icon name="lock" filled className="text-[16px]" />
            End-to-End Encrypted
          </p>
        </footer>
      </div>
    </div>
  );
};
