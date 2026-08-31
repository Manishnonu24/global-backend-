import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { reportUnexpectedError } from '../src/lib/observability/reportError.js';
import { getRequestId } from '../src/lib/observability/requestContext.js';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  setExtra: vi.fn(),
}));

vi.mock('../src/lib/observability/requestContext.js', () => ({
  getRequestId: vi.fn(),
}));

describe('Sentry Error Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures unexpected errors with context fields mapped', () => {
    const error = new Error('Test Sentry Error');
    reportUnexpectedError(error, { requestId: 'req-123', attemptsMade: 3 });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      tags: expect.objectContaining({ requestId: 'req-123' }),
      extra: expect.objectContaining({ attemptsMade: 3 })
    }));
  });

  it('handles missing requestId gracefully', () => {
    const error = new Error('Another Error');
    reportUnexpectedError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      tags: expect.objectContaining({ requestId: undefined }),
      extra: expect.objectContaining({ attemptsMade: undefined })
    }));
  });
});
