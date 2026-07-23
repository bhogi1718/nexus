import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { generateKeypair, storeKeys } from '../services/cryptoService';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const Signup = () => {
  const [step, setStep] = useState(1); // 1: email entry, 2: otp verification
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/send-otp', { email: formData.email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { publicKey, secretKey } = generateKeypair();
      const response = await api.post('/auth/verify-otp-signup', {
        name: formData.name,
        email: formData.email,
        otp: formData.otp,
        publicKey,
        secretKey
      });
      storeKeys(publicKey, secretKey);
      // Update auth context so ProtectedRoute lets us through immediately
      const { accessToken, refreshToken } = response.data;
      loginWithToken(accessToken, refreshToken, response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-accent-hover rounded-2xl mb-4">
            <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Nexus</h1>
          <p className="text-text-muted">Create your account</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">Join Nexus</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Email Entry */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-button mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTPAndSignup} className="space-y-4">
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg mb-4">
                <p className="text-sm text-text-primary">Verification code sent to <strong>{formData.email}</strong></p>
                <p className="text-xs text-text-muted mt-2">Check your inbox for the 6-digit code</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">Verification Code</label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className="auth-input text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength="6"
                  required
                />
                <p className="text-xs text-text-muted mt-1">6-digit code from email</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  className="flex-1 py-3 px-4 border-2 border-border text-text-secondary font-semibold rounded-lg hover:bg-background transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 auth-button"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-text-muted">Already have an account?</span>
            </div>
          </div>

          <Link to="/login" className="block mt-6 w-full text-center px-4 py-3 border-2 border-accent text-accent font-semibold rounded-lg hover:bg-accent/10 transition-colors">
            Sign In
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-8">
          Secure messaging for everyone
        </p>
      </div>
    </div>
  );
};
