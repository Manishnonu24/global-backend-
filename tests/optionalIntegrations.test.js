import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/integrations/status", () => ({
  isFlipbookConfigured: vi.fn(() => false),
}));

describe("optional integrations", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.FLIPBOOK_API_URL;
    delete process.env.NEXT_PUBLIC_FLIPBOOK_API_URL;
    delete process.env.TYPESENSE_HOST;
    delete process.env.TYPESENSE_ADMIN_API_KEY;
  });

  it("does not treat a Typesense API key alone as configured", async () => {
    process.env.TYPESENSE_ADMIN_API_KEY = "key-only";
    const { isTypesenseConfigured } = await import("@/lib/typesense");

    expect(isTypesenseConfigured()).toBe(false);
  });

  it("returns 503 for Stripe checkout when Stripe is not configured", async () => {
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const req = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({
        serviceTitle: "Consulting",
        fullName: "Test User",
        email: "test@example.com",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe("INTEGRATION_NOT_CONFIGURED");
  }, 15000);

  it("returns 503 for flipbook upload when the API URL is not configured", async () => {
    const { POST } = await import("@/app/api/media/flipbook-upload/route");
    const form = new FormData();
    form.append("pdf", new Blob(["%PDF"], { type: "application/pdf" }), "issue.pdf");

    const req = new Request("http://localhost:3000/api/media/flipbook-upload", {
      method: "POST",
      body: form,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe("INTEGRATION_NOT_CONFIGURED");
  });
});
