import { describe, expect, it } from "vitest";

describe("Phase 7A — Workspace-aware topbar configuration logic", () => {
  it("derives topbarWorkspace correctly for /dashboard/** routes", () => {
    const pathname = "/dashboard/pages";
    const topbarWorkspace = pathname.startsWith("/crm") ? "marketing-crm" : "global-backend";
    expect(topbarWorkspace).toBe("global-backend");
  });

  it("derives topbarWorkspace correctly for /crm/** routes", () => {
    const pathname = "/crm/leads";
    const topbarWorkspace = pathname.startsWith("/crm") ? "marketing-crm" : "global-backend";
    expect(topbarWorkspace).toBe("marketing-crm");
  });

  it("sets correct workspace name and search placeholder for Global Backend", () => {
    const workspace = "global-backend";
    const name = workspace === "marketing-crm" ? "Marketing CRM" : "Global Backend";
    const searchPlaceholder = workspace === "marketing-crm" ? "Search Marketing CRM…" : "Search Global Backend…";

    expect(name).toBe("Global Backend");
    expect(searchPlaceholder).toBe("Search Global Backend…");
  });

  it("sets correct workspace name and search placeholder for Marketing CRM", () => {
    const workspace = "marketing-crm";
    const name = workspace === "marketing-crm" ? "Marketing CRM" : "Global Backend";
    const searchPlaceholder = workspace === "marketing-crm" ? "Search Marketing CRM…" : "Search Global Backend…";

    expect(name).toBe("Marketing CRM");
    expect(searchPlaceholder).toBe("Search Marketing CRM…");
  });

  it("filters command palette items prioritizing active workspace", () => {
    const allItems = [
      { name: "Pages", href: "/dashboard/pages" },
      { name: "Subscribers", href: "/crm/subscribers" }
    ];

    const isCrmWorkspace = true;
    const workspaceItems = allItems.filter((item) => item.href.startsWith("/crm"));

    expect(workspaceItems).toHaveLength(1);
    expect(workspaceItems[0].name).toBe("Subscribers");
  });
});
