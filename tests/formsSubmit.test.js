import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    site: {
      findUnique: vi.fn().mockResolvedValue({ id: "AHP", name: "A Health Place" }),
    },
    ipblock: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    globalsettings: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    contactformsubmission: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "sub-123",
        createdAt: new Date(),
        ...data,
      })),
    },
    lead: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "lead-456",
        createdAt: new Date(),
        ...data,
      })),
    },
    newsletter: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "news-1" }),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: mocks.prisma,
}));

vi.mock("@/core/events", () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

describe("POST /api/forms/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates both contactformsubmission and CRM lead with sourcePage field", async () => {
    const { POST } = await import("@/app/api/forms/submit/route");

    const req = new Request("http://localhost:3000/api/forms/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: "AHP",
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+15551234567",
        message: "Hello, I have an inquiry.",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.submissionId).toBe("sub-123");
    expect(json.data.leadId).toBe("lead-456");

    expect(mocks.prisma.contactformsubmission.create).toHaveBeenCalledWith({
      data: {
        siteId: "AHP",
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+15551234567",
        message: "Hello, I have an inquiry.",
        status: "new",
      },
    });

    expect(mocks.prisma.lead.create).toHaveBeenCalledWith({
      data: {
        siteId: "AHP",
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+15551234567",
        notes: "Hello, I have an inquiry.",
        status: "new",
        sourcePage: "contact_form",
      },
    });
  });
});
