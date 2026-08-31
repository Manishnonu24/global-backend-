function parseBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function configuredAuthUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  );
}

export function isFrontendAuthCookieSecure() {
  const explicit = parseBoolean(process.env.FRONTEND_AUTH_COOKIE_SECURE);
  if (explicit !== null) return explicit;

  const authUrl = configuredAuthUrl();
  const isHttps = authUrl ? authUrl.startsWith("https://") : false;
  const isProduction = process.env.NODE_ENV === "production";

  return isProduction && isHttps;
}

export function getFrontendSessionCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Secure-frontend-session-token"
    : "frontend-session-token";
}

export function getFrontendCsrfCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Host-frontend-csrf-token"
    : "frontend-csrf-token";
}

export function getFrontendCallbackUrlCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Secure-frontend-callback-url"
    : "frontend-callback-url";
}

export function getFrontendPkceCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Secure-frontend-pkce-code-verifier"
    : "frontend-pkce-code-verifier";
}

export function getFrontendStateCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Secure-frontend-state"
    : "frontend-state";
}

export function getFrontendNonceCookieName() {
  return isFrontendAuthCookieSecure()
    ? "__Secure-frontend-nonce"
    : "frontend-nonce";
}
