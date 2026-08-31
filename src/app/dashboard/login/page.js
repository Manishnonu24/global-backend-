"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";

// Inner component that uses useSearchParams — must be inside <Suspense>
function LoginAndProjectLanding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFaRequired, setTwoFaRequired] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");

  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
    const isNgrok = hostname.endsWith(".ngrok.io") ||
      hostname.endsWith(".ngrok-free.dev") ||
      hostname.endsWith(".vercel.app");

    const useTestKey = isIpAddress || isNgrok || hostname === "localhost" || hostname === "127.0.0.1";
    const activeKey = useTestKey
      ? "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
      : process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    setTimeout(() => {
      setRecaptchaSiteKey(activeKey);
    }, 0);
  }, []);

  // Load the reCAPTCHA v3 script dynamically.
  useEffect(() => {
    if (!recaptchaSiteKey) return;

    const scriptId = "recaptcha-script";
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      const currentSrc = script.getAttribute("src");
      if (currentSrc && !currentSrc.includes(recaptchaSiteKey)) {
        script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
      }
    }
  }, [recaptchaSiteKey]);

  // If already authenticated, check if role is admin and route to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      const role = session?.user?.globalRole;
      if (role && role !== "VISITOR" && role !== "USER") {
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/dashboard";
        window.location.assign(callbackUrl);
      } else {
        router.replace("/");
      }
    }
  }, [status, session, router, searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");

    setLoading(true);

    try {
      let token = "dev_bypass_recaptcha";
      if (
        typeof window !== "undefined" &&
        window.grecaptcha &&
        recaptchaSiteKey
      ) {
        token = await new Promise((resolve) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha
              .execute(recaptchaSiteKey, { action: "login" })
              .then(resolve)
              .catch((err) => {
                console.error("reCAPTCHA execution error:", err);
                resolve("recaptcha_error");
              });
          });
        });
      }

      const preRes = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token }),
      });

      const preData = await preRes.json();
      if (!preRes.ok) {
        setLoading(false);
        return setError(preData.error || "Verification failed");
      }

      if (preData.data?.twoFARequired && !twoFaRequired) {
        setTwoFaRequired(true);
        setLoading(false);
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        twoFACode: twoFaCode || undefined,
        recaptchaToken: token,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/dashboard";
        window.location.assign(callbackUrl);
      }
    } catch (err) {
      console.error("Login submission error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && session?.user?.globalRole !== "VISITOR")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-light)] dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2
            className="animate-spin text-[var(--color-accent)] mx-auto"
            size={36}
          />
          <p className="dash-caption font-medium">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 font-sans relative">
      {/* Login Card — flat surface system matching dashboard tokens */}
      <div
        id="login-card-section"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-800 rounded-[var(--radius-card)] p-8 relative z-10"
      >
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-bold border border-[var(--color-accent)]/20">
            <ShieldCheck size={13} />
            Secure Portal
          </div>
          <h1 className="dash-page-title text-slate-900 dark:text-white">
            Global Backend Admin
          </h1>
          <p className="dash-caption">
            Sign in with your administrative credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {twoFaRequired ? (
            <div>
              <label
                htmlFor="twoFaCode"
                className="dash-caption font-bold uppercase tracking-wider block mb-1.5"
              >
                Two-Factor Authentication Code
              </label>
              <input
                id="twoFaCode"
                type="text"
                required
                maxLength={6}
                value={twoFaCode}
                onChange={(e) => {
                  setTwoFaCode(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 123456"
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--color-accent)] text-center font-mono tracking-widest"
              />
              <p className="dash-caption mt-1.5 text-center">
                Open your authenticator app to retrieve your security code.
              </p>
            </div>
          ) : (
            <>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="dash-caption font-bold uppercase tracking-wider block mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="admin@example.com"
                  className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--color-accent)] transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="password"
                    className="dash-caption font-bold uppercase tracking-wider block"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="dash-caption font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 pr-10 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius-input)] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--color-accent)] hover:opacity-90 text-white px-4 py-2.5 text-xs font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {twoFaRequired ? "Verifying OTP…" : "Verifying Credentials…"}
              </>
            ) : twoFaRequired ? (
              "Verify Code & Sign In"
            ) : (
              "Sign In to Dashboard"
            )}
          </button>

          {twoFaRequired && (
            <button
              type="button"
              onClick={() => {
                setTwoFaRequired(false);
                setTwoFaCode("");
                setError("");
              }}
              className="w-full text-center dash-caption font-semibold hover:underline mt-1"
            >
              Back to Sign In
            </button>
          )}
        </form>

        <p className="mt-6 text-center dash-caption">
          Protected by NextAuth credentials verification.
        </p>
      </div>
    </div>
  );
}

// Outer page component with Suspense
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-light)] dark:bg-slate-950">
          <Loader2 className="animate-spin text-[var(--color-accent)]" size={32} />
        </div>
      }
    >
      <LoginAndProjectLanding />
    </Suspense>
  );
}
