"use client";
import { useEffect } from "react";

/**
 * Injects analytics scripts client-side only (no SSR script tags).
 * This avoids React 19 warnings about <script> elements rendered server-side.
 */
export default function AnalyticsScripts({ analytics }) {
  useEffect(() => {
    if (!analytics) return;

    // Google Tag Manager
    const gtmIdValue = analytics.gtmId || analytics.googleTagManagerId;
    if (gtmIdValue) {
      const gtmScript = document.createElement("script");
      gtmScript.id = "google-tag-manager";
      gtmScript.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmIdValue}');
      `;
      document.head.appendChild(gtmScript);
    }

    // Google Analytics
    const gaIdValue = analytics.gaMeasurementId || analytics.googleAnalyticsId;
    if (gaIdValue) {
      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaIdValue}`;
      document.head.appendChild(gaScript);

      const gaInit = document.createElement("script");
      gaInit.id = "google-analytics";
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaIdValue}');
      `;
      document.head.appendChild(gaInit);
    }

    // Microsoft Clarity
    if (analytics.clarityId) {
      const clarityScript = document.createElement("script");
      clarityScript.id = "microsoft-clarity";
      clarityScript.innerHTML = `
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/v/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${analytics.clarityId}");
      `;
      document.head.appendChild(clarityScript);
    }

    // Meta Pixel
    if (analytics.metaPixelId) {
      const metaScript = document.createElement("script");
      metaScript.id = "meta-pixel";
      metaScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${analytics.metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(metaScript);

      // Meta Pixel noscript fallback
      const metaNoscript = document.createElement("noscript");
      const metaImg = document.createElement("img");
      metaImg.height = 1;
      metaImg.width = 1;
      metaImg.style.display = "none";
      metaImg.src = `https://www.facebook.com/tr?id=${analytics.metaPixelId}&ev=PageView&noscript=1`;
      metaImg.alt = "";
      metaNoscript.appendChild(metaImg);
      document.body.appendChild(metaNoscript);
    }

    // LinkedIn Insight
    if (analytics.linkedInTagId) {
      const linkedinScript = document.createElement("script");
      linkedinScript.id = "linkedin-insight";
      linkedinScript.innerHTML = `
        _linkedin_partner_id = "${analytics.linkedInTagId}";
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        (function(l) {
        if (!l) {window._linkedin_data_partner_script_loaded = true;
        var d = document; var s = d.getElementsByTagName("script")[0];
        var b = d.createElement("script");
        b.type = "text/javascript";b.async = true;
        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
        s.parentNode.insertBefore(b, s);}})(window._linkedin_data_partner_ids[0]);
      `;
      document.head.appendChild(linkedinScript);

      // LinkedIn noscript fallback
      const liNoscript = document.createElement("noscript");
      const liImg = document.createElement("img");
      liImg.height = 1;
      liImg.width = 1;
      liImg.style.display = "none";
      liImg.src = `https://px.ads.linkedin.com/collect/?pid=${analytics.linkedInTagId}&fmt=gif`;
      liImg.alt = "";
      liNoscript.appendChild(liImg);
      document.body.appendChild(liNoscript);
    }
  }, [analytics]);

  return null;
}
