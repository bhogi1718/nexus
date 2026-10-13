import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout, FormError } from '../components/auth/AuthLayout';
import { OtpInput, isOtpComplete } from '../components/auth/OtpInput';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { TextField } from '../components/ui/TextField';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_S = 30;

export const Login = () => {
  const [step, setStep] = useState(1); // 1: email entry, 2: otp verification
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const { user, loading: authLoading, loginWithToken } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!authLoading && user) return <Navigate to="/chat" replace />;

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp-login', { email });
      setStep(2);
      setOtp('');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err.response?.data?.message || 'We could not send a code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    requestCode();
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

      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'That code didn’t work. Check it and try again.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <span className="text-content-secondary">
      New to Nexus?{' '}
      <Link to="/signup" className="font-semibold text-primary hover:underline underline-offset-4">Create an account</Link>
    </span>
  );

  if (step === 1) {
    return (
      <AuthLayout
        title="Welcome back"
        subtitle="Enter your email and we'll send you a one-time sign-in code."
        footer={footer}
      >
        <FormError>{error}</FormError>
        <form onSubmit={handleSendOTP} className="space-y-lg">
          <TextField
            label="Email address"
            type="email"
            icon="alternate_email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            autoFocus
            required
          />
          <Button type="submit" size="lg" fullWidth loading={loading} iconRight={loading ? undefined : 'arrow_forward'}>
            {loading ? 'Sending code…' : 'Continue'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={<>We sent a 6-digit code to <strong className="text-content font-semibold">{email}</strong>.</>}
      footer={footer}
    >
      <FormError>{error}</FormError>
      <form onSubmit={handleVerifyOTPAndLogin} className="space-y-lg">
        <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!isOtpComplete(otp, OTP_LENGTH)}
        >
          {loading ? 'Verifying…' : 'Sign in'}
        </Button>

        <div className="flex items-center justify-between text-body-sm">
          <button
            type="button"
            onClick={() => { setStep(1); setError(''); }}
            className="inline-flex items-center gap-1 text-content-secondary hover:text-content transition-colors"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Use a different email
          </button>
          <button
            type="button"
            onClick={requestCode}
            disabled={cooldown > 0 || loading}
            className="font-semibold text-primary disabled:text-content-muted disabled:cursor-not-allowed hover:underline underline-offset-4 tabular-nums"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
