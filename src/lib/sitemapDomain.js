import { getDefaultSiteMetadata } from "@/lib/siteResolver";

const LOCAL_OR_IP_HOST_RE = /^(localhost|127(?:\.\d{1,3}){3}|0(?:\.\d{1,3}){3}|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:]+\])$/i;

export function resolveSitemapDomain(rawDomain, siteId) {
  const metadata = getDefaultSiteMetadata(siteId);
  const defaultDomain = metadata.domain ? `https://${metadata.domain}` : "http://localhost:3000";
  const candidate = String(rawDomain || "").trim();

  if (!candidate) {
    return defaultDomain;
  }

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname;
    const isDefaultSite = Boolean(metadata.domain);

    if (isDefaultSite && LOCAL_OR_IP_HOST_RE.test(host)) {
      return defaultDomain;
    }

    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return defaultDomain;
  }
}
