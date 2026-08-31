import { beforeEach, describe, expect, it, vi } from "vitest";
import { userHasSiteRole } from "@/lib/siteAuth";

const prismaMock = vi.hoisted(() => ({
  siteUser: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

describe("first-run site authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a SUPERADMIN without a SiteUser row", async () => {
    const allowed = await userHasSiteRole(
      { id: "super-1", globalRole: "SUPERADMIN" },
      "AHP",
      "ADMIN"
    );

    expect(allowed).toBe(true);
    expect(prismaMock.siteUser.findUnique).not.toHaveBeenCalled();
  });
});
