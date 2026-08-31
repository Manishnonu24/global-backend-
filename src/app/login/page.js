'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import RecaptchaWidget from '@/components/RecaptchaWidget';

function LoginClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'register' ? 'register' : 'login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP Verification States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Handle URL tabs (e.g. /login?tab=register)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setTimeout(() => setActiveTab('register'), 0);
    } else {
      setTimeout(() => setActiveTab('login'), 0);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const recaptchaMeta = typeof window !== 'undefined' ? document.querySelector('meta[name="recaptcha-site-key"]') : null;
    const siteKeyVal = recaptchaMeta ? recaptchaMeta.getAttribute('content') : null;
    
    let token = null;
    if (siteKeyVal && typeof window !== 'undefined' && window.grecaptcha && typeof window.grecaptcha.getResponse === 'function') {
      try {
        token = window.grecaptcha.getResponse();
      } catch (err) {
        console.warn("reCAPTCHA getResponse failed:", err);
      }
    }

    if (siteKeyVal && !token) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    if (!email.trim() || !password) {
      return setError('Please enter both email and password.');
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password.');
        setLoading(false);
      } else {
        setSuccessMsg('Logged in successfully!');
        const callbackUrl = searchParams.get('callbackUrl') || '/';
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 8) {
      return 'Password must be at least 8 characters long (e.g. Pass1234).';
    }
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return 'Password must contain both letters and numbers (e.g. Pass1234).';
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const recaptchaMeta = typeof window !== 'undefined' ? document.querySelector('meta[name="recaptcha-site-key"]') : null;
    const siteKeyVal = recaptchaMeta ? recaptchaMeta.getAttribute('content') : null;
    const token = typeof window !== 'undefined' && window.grecaptcha && typeof window.grecaptcha.getResponse === 'function' ? window.grecaptcha.getResponse() : null;

    if (siteKeyVal && !token) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    if (!email.trim() || !password || !name.trim() || !username.trim()) {
      return setError('All fields are required.');
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      return setError(pwdError);
    }

    setLoading(true);

    try {
      const regRes = await fetch('/api/quizess/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name,
          username,
          email,
          password,
        }),
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        setLoading(false);
        return setError(regData.error || 'Registration failed');
      }

      if (regData.requiresOtp) {
        setShowOtpScreen(true);
        setSuccessMsg(`Verification code sent to ${email}. Please check your inbox.`);
        setLoading(false);
        return;
      }

      setSuccessMsg('Registration successful! Logging you in...');

      const logRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (logRes?.error) {
        setError('Auto login failed. Please sign in manually.');
        setLoading(false);
      } else {
        const callbackUrl = searchParams.get('callbackUrl') || '/';
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during registration.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp || otp.trim().length !== 6) {
      return setError('Please enter the 6-digit verification code.');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/quizess/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        return setError(data.error || 'Verification failed');
      }

      setSuccessMsg('Account verified! Logging you in...');

      const logRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (logRes?.error) {
        setError('Verification successful, but auto login failed. Please sign in manually.');
        setShowOtpScreen(false);
        setActiveTab('login');
        setLoading(false);
      } else {
        const callbackUrl = searchParams.get('callbackUrl') || '/';
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during verification.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/quizess/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_otp',
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code');
      } else {
        setSuccessMsg('A new 6-digit verification code has been sent to your email.');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Remove full-screen blocking loader to prevent hangs and allow instant access to login form

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-48 pb-36">
        <div className="w-full max-w-[620px] min-h-[620px] flex flex-col bg-white rounded-[32px] border border-slate-200/60 p-8 md:p-10 shadow-xl"
          style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.03)' }}>

          <h2 className="text-center font-heading font-extrabold text-[24px] text-[#1e2a35] mb-6">
            Sign Up or Login
          </h2>

          {/* Header tabs */}
          <div className="flex border-b border-slate-100 mb-8">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
              className="flex-1 pb-4 text-[15px] font-heading font-extrabold transition-all border-b-2 cursor-pointer"
              style={{
                borderColor: activeTab === 'login' ? '#0f7c85' : 'transparent',
                color: activeTab === 'login' ? '#1e2a35' : '#cbd5e1',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
              className="flex-1 pb-4 text-[15px] font-heading font-extrabold transition-all border-b-2 cursor-pointer"
              style={{
                borderColor: activeTab === 'register' ? '#0f7c85' : 'transparent',
                color: activeTab === 'register' ? '#1e2a35' : '#cbd5e1',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 pr-12 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end -mt-1">
                  <Link
                    href="/forgot-password"
                    className="text-[12px] font-heading font-bold text-[#0f7c85] hover:text-[#0c6b73] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 rounded-xl p-3 text-[12px] font-semibold border border-red-100">
                    ⚠️ {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-green-50 text-[#00b050] rounded-xl p-3 text-[12px] font-semibold border border-green-100">
                    ✓ {successMsg}
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <RecaptchaWidget />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-50 cursor-pointer shadow-sm mt-8"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          ) : showOtpScreen ? (
            <form onSubmit={handleVerifyOtp} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-14 h-14 bg-teal-50 text-[#0f7c85] rounded-full flex items-center justify-center mx-auto mb-3 border border-teal-100">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-slate-800">Verify Your Email</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    We sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="834912"
                    className="w-full text-center tracking-[12px] font-mono text-2xl font-bold rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 rounded-xl p-3 text-[12px] font-semibold border border-red-100">
                    ⚠️ {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-green-50 text-[#00b050] rounded-xl p-3 text-[12px] font-semibold border border-green-100">
                    ✓ {successMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setShowOtpScreen(false); setError(''); setSuccessMsg(''); }}
                    className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Change Email
                  </button>
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResendOtp}
                    className="text-[#0f7c85] hover:underline font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isResending ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-50 cursor-pointer shadow-sm mt-8"
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. Pass1234"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 pr-12 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Must be at least 8 characters with both letters & numbers (e.g. <span className="font-mono text-slate-500 font-semibold">Pass1234</span>)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 rounded-xl p-3 text-[12px] font-semibold border border-red-100">
                    ⚠️ {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-green-50 text-[#00b050] rounded-xl p-3 text-[12px] font-semibold border border-green-100">
                    ✓ {successMsg}
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <RecaptchaWidget />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-50 cursor-pointer shadow-sm mt-8"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-auto pt-6 text-center text-[12px] text-slate-400">
            By signing in, you agree to our{' '}
            <Link href="/legal/terms" className="text-accent underline font-semibold">Terms</Link> and{' '}
            <Link href="/legal/privacy" className="text-accent underline font-semibold">Privacy Policy</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <Loader2 className="animate-spin text-[#0f7c85]" size={32} />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
