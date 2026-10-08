'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

/**
 * RecaptchaWidget
 *
 * Renders a Google reCAPTCHA v2 "I'm not a robot" checkbox widget only when a
 * `recaptcha-site-key` meta tag is present in the document head. This matches
 * the pattern used in login/page.js, forgot-password/page.js, and
 * reset-password/page.js, where form handlers read the same meta tag and call
 * `window.grecaptcha.getResponse()` to retrieve the token.
 *
 * If no site key is configured, the component renders nothing – the forms are
 * designed to work without reCAPTCHA in that case.
 *
 * Usage:
 *   <RecaptchaWidget />
 *
 * The site key is injected into the page via a <meta name="recaptcha-site-key"
 * content="YOUR_SITE_KEY"> tag (added by next.config or a layout component).
 */
export default function RecaptchaWidget() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [siteKey, setSiteKey] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Read the site key from the <meta> tag injected by the server
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="recaptcha-site-key"]');
    const key = meta ? meta.getAttribute('content') : null;
    if (key) setSiteKey(key);
  }, []);

  // Render the reCAPTCHA widget once the API script is loaded and we have a key
  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current) return;
    if (widgetIdRef.current !== null) return; // already rendered

    const tryRender = () => {
      if (
        typeof window === 'undefined' ||
        !window.grecaptcha ||
        typeof window.grecaptcha.render !== 'function'
      ) {
        // grecaptcha not ready yet – retry in 200 ms
        setTimeout(tryRender, 200);
        return;
      }

      // Only render if the container is still empty
      if (containerRef.current && containerRef.current.childElementCount === 0) {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
        });
      }
    };

    tryRender();
  }, [siteKey, scriptReady]);

  // Nothing to render when reCAPTCHA is not configured
  if (!siteKey) return null;

  return (
    <>
      {/* Load the reCAPTCHA API script once with explicit render */}
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
      />

      {/* Widget mount point */}
      <div
        ref={containerRef}
        id="recaptcha-widget-container"
        className="flex justify-center my-1"
        aria-label="reCAPTCHA verification"
      />
    </>
  );
}
