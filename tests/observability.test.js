import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { reportUnexpectedError } from '../src/lib/observability/reportError.js';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn().mockReturnValue('mock-event-id-12345'),
  flush: vi.fn().mockResolvedValue(true),
  setTag: vi.fn(),
  setExtra: vi.fn(),
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    systemErrorLog: {
      count: vi.fn().mockResolvedValue(5),
    },
  },
}));

vi.mock('../src/lib/redis.js', () => ({
  getRedisStatus: vi.fn().mockResolvedValue({ status: 'ok', configured: true }),
  isRedisConfigured: vi.fn().mockReturnValue(true),
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
  },
}));

vi.mock('../src/lib/apiAuth.js', () => ({
  checkSitePermission: vi.fn(),
}));

describe('Observability & Telemetry Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Observability status API rejects unauthenticated requests
  it('1. rejects unauthenticated status requests with 401', async () => {
    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({ error: 'Unauthorized', status: 401 });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  // Test 2: Non-SUPERADMIN users cannot access global configuration
  it('2. restricts global configuration details for non-SUPERADMIN users (ADMIN)', async () => {
    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'admin-1', globalRole: 'ADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isSuperAdmin).toBe(false);
    expect(json.data.sentry).toBeUndefined();
    expect(json.data.loki).toBeUndefined();
    expect(json.data.application.siteErrorLogsCount).toBe(5);
  });

  // Test 3: No response contains credentials or DSNs
  it('3. never exposes raw DSNs, API keys, tokens or credentials in status responses', async () => {
    process.env.SENTRY_DSN = 'https://secret-dsn@sentry.io/123';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://secret-dsn@sentry.io/123';
    process.env.SENTRY_AUTH_TOKEN = 'secret-sentry-token';
    process.env.GRAFANA_LOKI_USER = '123456';
    process.env.GRAFANA_LOKI_API_KEY = 'secret-loki-key';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);
    const text = await res.text();

    expect(text).not.toContain('secret-dsn');
    expect(text).not.toContain('secret-sentry-token');
    expect(text).not.toContain('secret-loki-key');
    expect(text).not.toContain('123456');
  });

  // Test 4: Sentry configuration booleans are calculated correctly
  it('4. calculates Sentry configuration booleans correctly from env vars', async () => {
    process.env.SENTRY_DSN = 'https://key@ingest.sentry.io/1';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@ingest.sentry.io/1';
    process.env.SENTRY_AUTH_TOKEN = 'token';
    process.env.SENTRY_PROJECT_URL = 'https://myorg.sentry.io/issues/';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.sentry.runtimeConfigured).toBe(true);
    expect(json.data.sentry.browserConfigured).toBe(true);
    expect(json.data.sentry.sourceMapsConfigured).toBe(true);
    expect(json.data.sentry.projectLinkConfigured).toBe(true);
  });

  // Test 5: Loki configuration booleans are calculated correctly
  it('5. calculates Loki configuration booleans correctly from env vars', async () => {
    process.env.GRAFANA_LOKI_HOST = 'https://logs-prod.grafana.net';
    process.env.GRAFANA_LOKI_USER = '1234';
    process.env.GRAFANA_LOKI_API_KEY = 'key';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.loki.writeTransportConfigured).toBe(true);
    expect(json.data.loki.hostConfigured).toBe(true);
    expect(json.data.loki.credentialsConfigured).toBe(true);
    expect(json.data.loki.appLabel).toBe('ahp-reimagined');
  });

  // Test 6: Missing optional URLs produce linkConfigured: false
  it('6. sets linkConfigured: false when optional dashboard links are missing', async () => {
    delete process.env.SENTRY_PROJECT_URL;
    delete process.env.GRAFANA_DASHBOARD_URL;
    delete process.env.GRAFANA_SYNTHETIC_CHECK_URL;

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.sentry.projectLinkConfigured).toBe(false);
    expect(json.data.loki.dashboardLinkConfigured).toBe(false);
    expect(json.data.syntheticMonitoring.linkConfigured).toBe(false);
  });

  // Test 7: Sentry test endpoint requires the feature flag
  it('7. returns 403 for Sentry test endpoint when OBSERVABILITY_TEST_ENABLED is not true', async () => {
    process.env.OBSERVABILITY_TEST_ENABLED = 'false';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { POST } = await import('../src/app/api/debug/sentry/route.js');
    const req = new Request('http://localhost:3000/api/debug/sentry', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Observability testing disabled');
  });

  // Test 8: Loki test endpoint requires the feature flag
  it('8. returns 403 for Loki test endpoint when OBSERVABILITY_TEST_ENABLED is not true', async () => {
    process.env.OBSERVABILITY_TEST_ENABLED = 'false';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { POST } = await import('../src/app/api/debug/log/route.js');
    const req = new Request('http://localhost:3000/api/debug/log', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Observability testing disabled');
  });

  // Test 9: Smoke endpoints are rate limited
  it('9. rate limits rapid smoke endpoint invocations with 429', async () => {
    process.env.OBSERVABILITY_TEST_ENABLED = 'true';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValue({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { POST } = await import('../src/app/api/debug/sentry/route.js');
    const req1 = new Request('http://localhost:3000/api/debug/sentry', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.99' },
    });
    const req2 = new Request('http://localhost:3000/api/debug/sentry', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.99' },
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    const res2 = await POST(req2);
    expect(res2.status).toBe(429);
    const json2 = await res2.json();
    expect(json2.error).toContain('Rate limit exceeded');
  });

  // Test 10: Sentry smoke response contains an event ID
  it('10. returns an eventId and sentAt timestamp in Sentry smoke test response', async () => {
    process.env.OBSERVABILITY_TEST_ENABLED = 'true';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { POST } = await import('../src/app/api/debug/sentry/route.js');
    const req = new Request('http://localhost:3000/api/debug/sentry', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.88' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.eventId).toBe('mock-event-id-12345');
    expect(json.data.sentAt).toBeDefined();
  });

  // Test 11: Loki smoke response contains probe ID and safe LogQL query
  it('11. returns probeId, requestId and safe LogQL query in Loki smoke test response', async () => {
    process.env.OBSERVABILITY_TEST_ENABLED = 'true';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { POST } = await import('../src/app/api/debug/log/route.js');
    const req = new Request('http://localhost:3000/api/debug/log', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.77', 'x-request-id': 'req-test-999' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.probeId).toBeDefined();
    expect(json.data.requestId).toBe('req-test-999');
    expect(json.data.lokiQuery).toContain('{app="ahp-reimagined"} |=');
  });

  // Test 12: Expected 4xx errors are not reported to Sentry
  it('12. filters out expected 4xx validation and auth errors from Sentry', () => {
    const valErr = new Error('Invalid input');
    valErr.name = 'ValidationError';

    reportUnexpectedError(valErr);
    expect(Sentry.captureException).not.toHaveBeenCalled();

    const authErr = new Error('Access denied');
    authErr.name = 'AuthError';

    reportUnexpectedError(authErr);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // Test 13: Unexpected errors go through reportUnexpectedError() once
  it('13. passes unexpected errors to Sentry once and deduplicates repeats', () => {
    const unexpectedErr = new Error('Database connection crash');
    unexpectedErr.name = 'DatabaseError';

    reportUnexpectedError(unexpectedErr, { requestId: 'req-555' });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Repeated call with exact same error object
    reportUnexpectedError(unexpectedErr, { requestId: 'req-555' });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  // Test 14: Site administrators cannot access another site's logs
  it('14. uses authenticated siteId for system error log counts', async () => {
    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-siteA',
      user: { id: 'admin-A', globalRole: 'ADMIN' },
    });

    const prismaMock = (await import('../src/lib/prisma.js')).default;

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status', {
      headers: { 'x-site-id': 'site-siteB-attempt' }, // client tries to forge siteB
    });
    await GET(req);

    expect(prismaMock.systemErrorLog.count).toHaveBeenCalledWith({
      where: { siteId: 'site-siteA' },
    });
  });

  // Test 15: Environment labels are consistent
  it('15. prefers OBSERVABILITY_ENV or SENTRY_ENVIRONMENT over NODE_ENV for telemetry label consistency', async () => {
    process.env.SENTRY_ENVIRONMENT = 'staging';
    process.env.NODE_ENV = 'production';

    const { checkSitePermission } = await import('../src/lib/apiAuth.js');
    checkSitePermission.mockResolvedValueOnce({
      siteId: 'site-123',
      user: { id: 'super-1', globalRole: 'SUPERADMIN' },
    });

    const { GET } = await import('../src/app/api/dashboard/observability/status/route.js');
    const req = new Request('http://localhost:3000/api/dashboard/observability/status');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.sentry.environment).toBe('staging');
    expect(json.data.loki.environment).toBe('staging');
  });
});
