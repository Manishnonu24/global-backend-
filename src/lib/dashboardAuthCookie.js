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

export function isDashboardAuthCookieSecure() {
  const explicit = parseBoolean(process.env.DASHBOARD_AUTH_COOKIE_SECURE);
  if (explicit !== null) return explicit;

  const authUrl = configuredAuthUrl();
  const isHttps = authUrl ? authUrl.startsWith("https://") : false;
  const isProduction = process.env.NODE_ENV === "production";

  return isProduction && isHttps;
}

export function getDashboardSessionCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Secure-dashboard-session-token"
    : "dashboard-session-token";
}

export function getDashboardCsrfCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Host-dashboard-csrf-token"
    : "dashboard-csrf-token";
}

export function getDashboardCallbackUrlCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Secure-dashboard-callback-url"
    : "dashboard-callback-url";
}

export function getDashboardPkceCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Secure-dashboard-pkce-code-verifier"
    : "dashboard-pkce-code-verifier";
}

export function getDashboardStateCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Secure-dashboard-state"
    : "dashboard-state";
}

export function getDashboardNonceCookieName() {
  return isDashboardAuthCookieSecure()
    ? "__Secure-dashboard-nonce"
    : "dashboard-nonce";
}
