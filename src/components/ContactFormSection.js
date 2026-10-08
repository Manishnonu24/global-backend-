'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * ContactFormSection
 * A CMS-rendered contact / lead-capture form section.
 * Used by PageRenderer.js for pages that include a contact form block.
 */
export default function ContactFormSection({ section = {} }) {
  const {
    heading     = 'Get in Touch',
    subheading  = 'Fill out the form below and we\'ll get back to you shortly.',
    buttonText  = 'Send Message',
    fields      = [],
    siteId,
    sourcePage  = 'Contact Form',
  } = section;

  const [form, setForm]       = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null); // 'success' | 'error'

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(siteId ? { 'x-site-id': siteId } : {}) },
        body: JSON.stringify({ ...form, sourcePage }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-xl mx-auto">
        {heading && (
          <h2 className="text-2xl font-extrabold text-[#1e2a35] text-center mb-2">{heading}</h2>
        )}
        {subheading && (
          <p className="text-sm text-slate-500 text-center mb-8">{subheading}</p>
        )}

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={40} className="text-[#0f7c85]" />
            <p className="font-semibold text-slate-700">Message sent! We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#0f7c85] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#0f7c85] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
              <textarea
                name="message"
                required
                value={form.message}
                onChange={handleChange}
                rows={5}
                placeholder="How can we help you?"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#0f7c85] focus:bg-white transition-all resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-semibold">
                <AlertCircle size={14} /> Something went wrong. Please try again.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-sm text-white bg-[#0f7c85] hover:bg-[#0c6b73] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Sending...' : buttonText}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
