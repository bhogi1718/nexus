import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, cryptoService } from '../services';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [step, setStep] = useState(1); // 1: email entry, 2: otp verification
  const [formData, setFormData] = useState({ email: '', otp: '' });
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
      await apiClient.post('/auth/send-otp-login', { email: formData.email });
      setStep(2);
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
      const response = await apiClient.post('/auth/verify-otp-login', {
        email: formData.email,
        otp: formData.otp
      });
      // Update auth context so ProtectedRoute lets us through immediately
      const { accessToken, refreshToken } = response.data;
      loginWithToken(accessToken, refreshToken, response.data.user);

      // Restore encryption keys: server is the source of truth so messages
      // decrypt on any device/session. Only generate if the server has none.
      const serverUser = response.data.user;
      if (serverUser.publicKey && serverUser.secretKey) {
        await cryptoService.storeKeys(serverUser.publicKey, serverUser.secretKey);
      } else {
        const keys = await cryptoService.getKeys();
        if (!keys || !keys.secretKey || !keys.publicKey) {
          const newKeys = cryptoService.generateKeypair();
          await cryptoService.storeKeys(newKeys.publicKey, newKeys.secretKey);
        }
        try {
          const keysToSync = await cryptoService.getKeys();
          await apiClient.post('/auth/update-public-key', {
            publicKey: keysToSync.publicKey,
            secretKey: keysToSync.secretKey
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Nexus</h1>
          <p className="text-blue-100">Connect with anyone, anytime</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome Back</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Email Entry */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
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
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
            <form onSubmit={handleVerifyOTPAndLogin} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-blue-900">Verification code sent to <strong>{formData.email}</strong></p>
                <p className="text-xs text-blue-700 mt-2">Check your inbox for the 6-digit code</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
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
                <p className="text-xs text-gray-500 mt-1">6-digit code from email</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
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
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
            </div>
          </div>

          <Link to="/signup" className="block mt-6 w-full text-center px-4 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors">
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-8">
          Secure messaging for everyone
        </p>
      </div>
    </div>
  );
};
