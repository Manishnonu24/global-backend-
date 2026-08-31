import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => {
  const pinoMock = vi.fn((opts) => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    opts
  }));
  pinoMock.stdTimeFunctions = { isoTime: vi.fn() };
  pinoMock.transport = vi.fn((opts) => opts);
  return { default: pinoMock };
});

describe('Loki Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('configures pino-loki with correct batching and redactions', async () => {
    // Setup env vars to trigger Loki transport
    process.env.GRAFANA_LOKI_HOST = 'http://localhost:3100';
    process.env.GRAFANA_LOKI_USER = 'user';
    process.env.GRAFANA_LOKI_API_KEY = 'token';

    const { logger } = await import('../src/lib/logger.js');
    const pinoMock = await import('pino');

    expect(pinoMock.default).toHaveBeenCalled();
    const opts = pinoMock.default.mock.calls[0][0];

    // Check redact paths
    expect(opts.redact.paths).toContain('req.headers.authorization');
    expect(opts.redact.paths).toContain('password');
    expect(opts.redact.paths).toContain('*.password');
    expect(opts.redact.paths).toContain('token');

    // Check transport
    expect(pinoMock.default.transport).toHaveBeenCalled();
    const transportOpts = pinoMock.default.transport.mock.calls[0][0];
    const lokiTransport = transportOpts.targets.find(t => t.target === 'pino-loki');
    expect(lokiTransport).toBeDefined();
    expect(lokiTransport.options.interval).toBe(5);
  });
});
