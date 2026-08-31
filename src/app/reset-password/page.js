"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Password validation — same rule as registration in src/app/login/page.js:
 *   min 8 chars, must contain both letters AND numbers.
 */
function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) {
    return "Password must be at least 8 characters long (e.g. Pass1234).";
  }
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return "Password must contain both letters and numbers (e.g. Pass1234).";
  }
  return null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // reCAPTCHA check (only if site key is configured)
    const recaptchaMeta = typeof window !== "undefined"
      ? document.querySelector('meta[name="recaptcha-site-key"]')
      : null;
    const siteKeyVal = recaptchaMeta ? recaptchaMeta.getAttribute("content") : null;
    const recaptchaToken =
      siteKeyVal &&
      typeof window !== "undefined" &&
      window.grecaptcha &&
      typeof window.grecaptcha.getResponse === "function"
        ? window.grecaptcha.getResponse()
        : null;

    if (siteKeyVal && !recaptchaToken) {
      setError("Please complete the reCAPTCHA verification.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token. Please use the link from your email.");
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message || "Invalid or expired token. Please request another reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-[480px] flex flex-col bg-white rounded-[32px] border border-slate-200/60 p-8 md:p-10 shadow-xl"
      style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.03)" }}
    >
      <h2 className="text-center font-heading font-extrabold text-[24px] text-[#1e2a35] mb-2">
        Create New Password
      </h2>
      <p className="text-center text-[13px] text-slate-400 mb-8">
        Enter a secure new password for your account.
      </p>

      {/* No-token warning — disables submit */}
      {!token && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700 font-semibold mb-6">
          <AlertCircle size={14} className="shrink-0" />
          No reset token found. Please use the link from your email or{" "}
          <Link href="/forgot-password" className="underline hover:no-underline">
            request a new one
          </Link>
          .
        </div>
      )}

      {success ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 bg-teal-50 text-[#0f7c85] rounded-full flex items-center justify-center border border-teal-100">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="font-heading font-extrabold text-[17px] text-[#1e2a35] mb-1">
              Password Changed!
            </p>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Your password has been reset successfully. You can now sign in with
              your new credentials.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors text-center shadow-sm"
          >
            Go to Sign In
          </Link>
        </div>
      ) : (
        /* ── Form state ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {/* New Password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 pr-12 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
              Min. 8 characters with at least one letter and one number.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 rounded-xl p-3 text-[12px] font-semibold border border-red-100 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <RecaptchaWidget />

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </span>
            ) : (
              "Save New Password"
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              href="/login"
              className="text-[12px] font-heading font-bold text-[#0f7c85] hover:text-[#0c6b73] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 pt-48 pb-36">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin text-[#0f7c85]" size={32} />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
