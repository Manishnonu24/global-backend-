'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Newsletter
 * Email newsletter subscribe section used by PageRenderer.js.
 */
export default function Newsletter({ section = {} }) {
  const {
    heading    = 'Stay in the Loop',
    subheading = 'Subscribe to our newsletter for the latest health insights and updates.',
    buttonText = 'Subscribe',
    siteId,
  } = section;

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(siteId ? { 'x-site-id': siteId } : {}) },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Subscription failed');
      }
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-[#0f7c85]/5 to-teal-50">
      <div className="max-w-lg mx-auto text-center">
        {heading && (
          <h2 className="text-2xl font-extrabold text-[#1e2a35] mb-2">{heading}</h2>
        )}
        {subheading && (
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">{subheading}</p>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 size={40} className="text-[#0f7c85]" />
            <p className="font-semibold text-slate-700">You're subscribed! Thanks for joining.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm focus:outline-none focus:border-[#0f7c85] transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-full font-bold text-sm text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Subscribing...' : buttonText}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-500 font-semibold">{error}</p>
        )}
      </div>
    </section>
  );
}
