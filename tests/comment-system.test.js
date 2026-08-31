import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { commentService } from "@/services/comment.service";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimiter";
import { checkSitePermission } from "@/lib/apiAuth";
import { getServerSession } from "next-auth";
import { frontendAuthOptions } from "@/lib/frontendAuth";
import { authOptions } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Mock next-auth — prevents Next.js headers() context errors in Vitest
// ---------------------------------------------------------------------------
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock("@/lib/prisma", () => {
  return {
    default: {
      post: { findFirst: vi.fn() },
      magazine: { findFirst: vi.fn() },
      user: { findFirst: vi.fn(), findUnique: vi.fn() },
      comment: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      systemerrorlog: { create: vi.fn() },
      systemErrorLog: { create: vi.fn() },
    },
  };
});

// ---------------------------------------------------------------------------
// Mock Redis (allows in-memory rate limiter to operate)
// ---------------------------------------------------------------------------
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Mock apiAuth — allow per-test configuration via checkSitePermission.mockResolvedValue
// ---------------------------------------------------------------------------
vi.mock("@/lib/apiAuth", async () => {
  const actual = await vi.importActual("@/lib/apiAuth");
  return { ...actual, checkSitePermission: vi.fn() };
});

// ---------------------------------------------------------------------------
// Mock siteResolver — ensures getDefaultSiteId returns "AHP" in tests
// ---------------------------------------------------------------------------
vi.mock("@/lib/siteResolver", () => ({
  getDefaultSiteId: vi.fn(() => "AHP"),
  DEFAULT_SITE_ID: "AHP",
}));

// ---------------------------------------------------------------------------
// Mock siteGuard — ensures getSiteId() returns "AHP" in all route tests
// ---------------------------------------------------------------------------
vi.mock("@/lib/siteGuard", () => ({
  getSiteId: vi.fn(() => "AHP"),
}));

describe("Comment System End-to-End Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Test 1: Frontend auth is authoritative (frontendAuthOptions used, not authOptions)
  // =========================================================================
  it("Regression Test 1: POST /api/comments authenticates using frontendAuthOptions and NOT authOptions", async () => {
    getServerSession.mockImplementation((options) => {
      if (options === frontendAuthOptions) {
        return Promise.resolve({ user: { id: "u1", email: "reader@example.com", name: "Reader A" } });
      }
      return Promise.resolve(null);
    });

    prisma.user.findFirst.mockResolvedValueOnce({
      id: "u1",
      name: "Reader A",
      email: "reader@example.com",
    });
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "health-tips" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: "health-tips", content: "Great read!" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    // Verify getServerSession was called with frontendAuthOptions
    expect(getServerSession).toHaveBeenCalledWith(frontendAuthOptions);
    expect(getServerSession).not.toHaveBeenCalledWith(authOptions);
  });

  // =========================================================================
  // Test 2: Dashboard session cannot become commenter
  // =========================================================================
  it("Regression Test 2: dashboard session cannot become commenter — frontend identity is strictly used", async () => {
    // Simulate both frontend and dashboard sessions available in environment
    getServerSession.mockImplementation((options) => {
      if (options === frontendAuthOptions) {
        return Promise.resolve({ user: { id: "reader_1", email: "reader@example.com", name: "Real Reader" } });
      }
      if (options === authOptions) {
        return Promise.resolve({ user: { id: "admin_1", email: "admin@example.com", name: "Admin User" } });
      }
      return Promise.resolve(null);
    });

    prisma.user.findFirst.mockResolvedValueOnce({
      id: "reader_1",
      name: "Real Reader",
      email: "reader@example.com",
    });
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "wellness" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: "wellness", content: "Enjoyed this post" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.authorName).toBe("Real Reader");
    expect(createData.authorEmail).toBe("reader@example.com");
    expect(createData.authorName).not.toBe("Admin User");
    expect(createData.authorEmail).not.toBe("admin@example.com");
  });

  // =========================================================================
  // Test 3: Current DB name wins over stale JWT name
  // =========================================================================
  it("Regression Test 3: current DB user record name wins over stale JWT session name", async () => {
    // JWT has old name
    getServerSession.mockResolvedValueOnce({
      user: { id: "user_renamed_1", name: "Old Name", email: "reader@example.com" },
    });

    // Database user profile was updated to "Updated Name"
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "user_renamed_1",
      name: "Updated Name",
      email: "reader@example.com",
    });
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "nutrition" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: "nutrition", content: "Helpful advice" }),
    });

    await POST(req);

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.authorName).toBe("Updated Name");
    expect(createData.authorName).not.toBe("Old Name");
  });

  // =========================================================================
  // Test 4: Spoofed body identity ignored
  // =========================================================================
  it("Regression Test 4: client-supplied authorName and authorEmail in body are strictly ignored", async () => {
    getServerSession.mockResolvedValueOnce({
      user: { id: "user_real", name: "Real User", email: "real@example.com" },
    });
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "user_real",
      name: "Real User",
      email: "real@example.com",
    });
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "test" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "post",
        targetId: "test",
        content: "Trying to spoof body name",
        authorEmail: "fake@evil.com",
        authorName: "Fake User",
        userId: "fake_id_999",
      }),
    });

    await POST(req);

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.authorName).toBe("Real User");
    expect(createData.authorEmail).toBe("real@example.com");
    expect(createData.authorName).not.toBe("Fake User");
    expect(createData.authorEmail).not.toBe("fake@evil.com");
  });

  // =========================================================================
  // Test 5: Missing frontend session returns 401 (dashboard session alone cannot auth)
  // =========================================================================
  it("Regression Test 5: missing frontend session returns 401 even if dashboard session is mocked", async () => {
    getServerSession.mockImplementation((options) => {
      if (options === frontendAuthOptions) {
        return Promise.resolve(null); // No frontend session
      }
      if (options === authOptions) {
        return Promise.resolve({ user: { id: "admin_1", email: "admin@example.com" } });
      }
      return Promise.resolve(null);
    });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: "p1", content: "Anon attempt" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  // =========================================================================
  // Test 6: Empty profile name fallback
  // =========================================================================
  it("Regression Test 6: empty or null user name falls back deterministically to email local-part", async () => {
    getServerSession.mockResolvedValueOnce({
      user: { id: "u_no_name", email: "john@example.com" },
    });
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "u_no_name",
      name: "   ", // blank name in DB
      email: "john@example.com",
    });
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "post-1" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    const { POST } = await import("@/app/api/comments/route");
    const req = new Request("http://localhost/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: "post-1", content: "Great tips" }),
    });

    await POST(req);

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.authorName).toBe("john");
    expect(createData.authorEmail).toBe("john@example.com");
  });

  // =========================================================================
  // Test 7: Public rendering contract (authorName exposed, authorEmail hidden)
  // =========================================================================
  it("Regression Test 7: public rendering contract returns authorName but never exposes authorEmail", async () => {
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP", slug: "my-post" });
    prisma.comment.findMany.mockResolvedValueOnce([
      { id: "c_approved", authorName: "Alice Smith", content: "Great post", createdAt: new Date() },
    ]);

    const comments = await commentService.getPublicComments("AHP", {
      targetType: "post",
      targetId: "my-post",
    });

    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: "AHP", postId: "p1", status: "approved" }),
        select: { id: true, authorName: true, content: true, createdAt: true },
      })
    );
    expect(comments.length).toBe(1);
    expect(comments[0].authorName).toBe("Alice Smith");
    expect(comments[0]).not.toHaveProperty("authorEmail");
    expect(comments[0]).not.toHaveProperty("status");
  });

  // =========================================================================
  // Test 8: Moderation remains intact (new comments pending, public only approved)
  // =========================================================================
  it("Regression Test 8: new comments are created with status=pending and only approved comments are public", async () => {
    prisma.post.findFirst.mockResolvedValueOnce({ id: "p1", siteId: "AHP" });
    prisma.comment.create.mockResolvedValueOnce({ id: "c1", status: "pending" });

    await commentService.createComment("AHP", {
      targetType: "post",
      targetId: "p1",
      content: "Moderation test",
      status: "approved", // Client attempts to force approved
      authorEmail: "user@example.com",
    });

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.status).toBe("pending");
  });

  // =========================================================================
  // Target Resolution Tests: Blog post and Magazine resolution
  // =========================================================================
  it("stores real post.id when creating a blog comment", async () => {
    prisma.post.findFirst.mockResolvedValueOnce({
      id: "post_cuid_123",
      siteId: "AHP",
      slug: "health-tips",
      title: "Health Tips",
    });
    prisma.comment.create.mockResolvedValueOnce({
      id: "comment_1",
      siteId: "AHP",
      postId: "post_cuid_123",
      magazineId: null,
      status: "pending",
    });

    await commentService.createComment("AHP", {
      targetType: "post",
      targetId: "health-tips",
      content: "Great article!",
      authorName: "Jane Doe",
      authorEmail: "jane@example.com",
    });

    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: "health-tips" }, { slug: "health-tips" }], siteId: "AHP" },
    });

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.postId).toBe("post_cuid_123");
  });

  it("magazine identifier is never inserted as postId", async () => {
    prisma.magazine.findFirst.mockResolvedValueOnce({
      id: 42,
      magazineId: "MAG-2026-08",
      slug: "aug-edition",
    });
    prisma.comment.create.mockResolvedValueOnce({
      id: "c_mag",
      postId: null,
      magazineId: 42,
      status: "pending",
    });

    await commentService.createComment("AHP", {
      targetType: "magazine",
      targetId: "aug-edition",
      content: "Great issue!",
      authorName: "Bob",
      authorEmail: "bob@example.com",
    });

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.magazineId).toBe(42);
    expect(createData.postId).toBeNull();
  });

  it("rejects invalid explicit targetType values", async () => {
    await expect(
      commentService.createComment("AHP", {
        targetType: "video",
        targetId: "some-id",
        content: "Invalid",
        authorEmail: "x@x.com",
      })
    ).rejects.toThrow();
  });

  // =========================================================================
  // CRM Moderation Tests: Permissions and Site Isolation
  // =========================================================================
  it("CRM endpoints return 403 when checkSitePermission returns error", async () => {
    const { GET } = await import("@/app/api/crm/comments/route");
    const { PUT, DELETE } = await import("@/app/api/crm/comments/[id]/route");

    checkSitePermission.mockResolvedValue({ error: "Forbidden: Insufficient permissions", status: 403 });

    const resGet = await GET(new Request("http://localhost/api/crm/comments"));
    expect(resGet.status).toBe(403);

    const resPut = await PUT(
      new Request("http://localhost/api/crm/comments/c1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(resPut.status).toBe(403);

    const resDelete = await DELETE(
      new Request("http://localhost/api/crm/comments/c1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(resDelete.status).toBe(403);
  });

  it("cross-site moderation is rejected — siteId included in Prisma update constraint", async () => {
    prisma.comment.update.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found"), { code: "P2025" })
    );

    await expect(
      commentService.updateCommentStatus("SITE_A", "comment_on_site_b", "approved")
    ).rejects.toThrow();

    expect(prisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: "SITE_A" }),
      })
    );
  });

  it("SUPERADMIN can access CRM comments without SiteUser mapping", async () => {
    checkSitePermission.mockResolvedValueOnce({ siteId: "AHP", user: { globalRole: "SUPERADMIN" } });
    prisma.comment.findMany.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/crm/comments/route");
    const res = await GET(new Request("http://localhost/api/crm/comments"));
    expect(res.status).toBe(200);
  });

  it("legacy magazine with siteId=NULL resolves for the canonical AHP site", async () => {
    prisma.magazine.findFirst.mockResolvedValueOnce({
      id: 99,
      magazineId: "LEGACY-001",
      slug: "legacy-edition",
      siteId: null,
    });
    prisma.comment.create.mockResolvedValueOnce({ id: "c_legacy", status: "pending" });

    await commentService.createComment("AHP", {
      targetType: "magazine",
      targetId: "legacy-edition",
      content: "Legacy mag comment",
      authorEmail: "user@example.com",
    });

    const createData = prisma.comment.create.mock.calls[0][0].data;
    expect(createData.magazineId).toBe(99);
    expect(createData.postId).toBeNull();
  });

  it("null-siteId magazine is not claimable by non-default tenant SITE_B", async () => {
    prisma.magazine.findFirst.mockResolvedValueOnce(null);

    await expect(
      commentService.createComment("SITE_B", {
        targetType: "magazine",
        targetId: "legacy-edition",
        content: "Attempt from wrong tenant",
        authorEmail: "user@evil.com",
      })
    ).rejects.toThrow();

    const query = prisma.magazine.findFirst.mock.calls[0][0];
    expect(query.where.siteId).toBe("SITE_B");
    expect(JSON.stringify(query.where)).not.toContain('"siteId":null');
  });

  it("allows comment submission when Redis is missing using in-memory rate limiter", async () => {
    const allowed = await checkRateLimit("127.0.0.1", 10);
    expect(allowed).toBe(true);
  });
});
