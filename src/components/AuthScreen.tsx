import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPasswordForEmail,
  updateUserPassword,
} from '../supabase';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  isPasswordReset?: boolean;
  onPasswordResetDone?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  isPasswordReset = false,
  onPasswordResetDone,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>(
    isPasswordReset ? 'reset_password' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isPasswordReset) {
      setMode('reset_password');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isPasswordReset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();

    // 1. Password Reset Mode (Setting new password after email link)
    if (mode === 'reset_password') {
      if (!password) {
        setErrorMsg('Please enter your new password.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await updateUserPassword(password);
        if (res.success) {
          setSuccessMsg('Password updated successfully! You can now sign in with your new password.');
          setPassword('');
          setConfirmPassword('');
          if (onPasswordResetDone) onPasswordResetDone();
          setTimeout(() => {
            setMode('login');
          }, 2000);
        } else {
          setErrorMsg(res.error || 'Failed to update password.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while updating password.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Forgot Password Mode (Requesting reset email)
    if (mode === 'forgot_password') {
      if (!cleanEmail) {
        setErrorMsg('Please enter your email address.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await resetPasswordForEmail(cleanEmail);
        if (res.success) {
          setSuccessMsg('Password reset link sent! Please check your email inbox.');
        } else {
          setErrorMsg(res.error || 'Failed to send reset link.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // General validation for Email & Password
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    // 3. Register Mode
    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await signUpWithEmail(cleanEmail, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.needsConfirmation || (res.message && res.message.includes('confirm'))) {
          // If email confirmation is needed, show "Check your email to confirm"
          setSuccessMsg(res.message || 'Check your email to confirm');
          // NEVER open the app without a real session
        } else if (res.session && res.user) {
          // Only open the app with a real session
          onAuthSuccess(res.user);
        } else {
          // No session came back
          setErrorMsg('This email already has an account. Sign in instead.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Sign up failed.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 4. Login Mode
    setIsLoading(true);
    try {
      const res = await signInWithEmail(cleanEmail, password);
      if (res.error) {
        // Show the real Supabase error on sign-in failures
        setErrorMsg(res.error);
      } else if (res.user && res.session) {
        onAuthSuccess(res.user);
      } else {
        setErrorMsg('Could not establish an authenticated session. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-amber-500 shadow-xl shadow-indigo-500/25 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              OmniPost Video
            </span>{' '}
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 align-middle">
              PRO
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Multi-Platform Video Publisher for YouTube Shorts & Instagram Reels
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Mode Tabs (Only for Login & Register) */}
          {mode !== 'forgot_password' && mode !== 'reset_password' && (
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Forgot Password Header */}
          {mode === 'forgot_password' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center mb-2"
              >
                ← Back to Sign In
              </button>
              <h2 className="text-lg font-bold text-white">Reset your password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>
          )}

          {/* Reset Password Header (Update Password) */}
          {mode === 'reset_password' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  if (onPasswordResetDone) onPasswordResetDone();
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center mb-2"
              >
                ← Back to Sign In
              </button>
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Set New Password</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Enter and confirm your new password below.
              </p>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
                {errorMsg.includes('Sign in instead') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="block mt-1 font-semibold text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Click here to Sign In
                  </button>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input (Not needed for reset_password mode) */}
            {mode !== 'reset_password' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Input (Login, Register & Reset Password modes) */}
            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    {mode === 'reset_password' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register and Reset Password modes) */}
            {(mode === 'register' || mode === 'reset_password') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {mode === 'reset_password' ? 'Confirm New Password' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? 'Sign In'
                      : mode === 'register'
                      ? 'Create Account'
                      : mode === 'reset_password'
                      ? 'Update Password'
                      : 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider & Google Sign-In */}
          {mode !== 'forgot_password' && mode !== 'reset_password' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2.5 px-4 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-sm font-medium text-slate-200 flex items-center justify-center space-x-3 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </>
          )}

          {/* Privacy & Isolation Note */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-User Isolation & End-to-End Encrypted Tokens</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
