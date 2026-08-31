"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecaptchaWidget from "@/components/RecaptchaWidget";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

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
      // Silently block, reCAPTCHA widget shows its own error
      return;
    }

    setLoading(true);

    try {
      // Always show generic success regardless of API response
      // to avoid leaking which emails are registered (email enumeration prevention)
      await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Intentionally swallowed — always show success
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-48 pb-36">
        <div
          className="w-full max-w-[480px] flex flex-col bg-white rounded-[32px] border border-slate-200/60 p-8 md:p-10 shadow-xl"
          style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.03)" }}
        >
          {submitted ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-14 h-14 bg-teal-50 text-[#0f7c85] rounded-full flex items-center justify-center border border-teal-100">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-[22px] text-[#1e2a35] mb-2">
                  Check Your Inbox
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  If an account exists for that email address, we&apos;ve sent a
                  password reset link. Please check your inbox and spam folder.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[13px] font-heading font-bold text-[#0f7c85] hover:text-[#0c6b73] transition-colors mt-2"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h2 className="text-center font-heading font-extrabold text-[24px] text-[#1e2a35] mb-2">
                Forgot Password?
              </h2>
              <p className="text-center text-[13px] text-slate-400 mb-8">
                Enter your email address and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[13.5px] outline-none focus:border-[#0f7c85] focus:bg-white transition-all duration-200"
                  />
                </div>

                <RecaptchaWidget />

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-4 rounded-full font-heading font-bold text-[14px] text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <div className="text-center pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[12px] font-heading font-bold text-[#0f7c85] hover:text-[#0c6b73] transition-colors"
                  >
                    <ArrowLeft size={13} />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
