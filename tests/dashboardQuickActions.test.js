import { describe, expect, it } from "vitest";
import { hasRole } from "../src/lib/rbac";

// Simulated quick actions list from the dashboard page
const allActions = [
  { label: "Database Backup", minRole: "ADMIN" },
  { label: "Security Console", minRole: "ADMIN" },
  { label: "Leads CRM", minRole: "EDITOR", additionalRoles: ["MARKETING"] },
  { label: "Manage Menus", minRole: "EDITOR" },
  { label: "New Blog Post", minRole: "AUTHOR" },
  { label: "Upload Media", minRole: "AUTHOR" },
  { label: "System Status", minRole: "VIEWER" },
  { label: "Manage Pages", minRole: "EDITOR" },
  { label: "Edit Blogs", minRole: "AUTHOR" },
];

function filterActionsForRole(globalRole) {
  return allActions.filter(
    (action) =>
      hasRole(globalRole, action.minRole) ||
      (action.additionalRoles || []).includes(globalRole)
  );
}

describe("Dashboard Quick Actions RBAC", () => {
  it("VIEWER role - sees only System Status", () => {
    const actions = filterActionsForRole("VIEWER").map((a) => a.label);
    expect(actions).toEqual(["System Status"]);
  });

  it("MARKETING role - sees System Status and Leads CRM (intentional escape hatch)", () => {
    const actions = filterActionsForRole("MARKETING").map((a) => a.label);
    
    expect(actions).toContain("System Status");
    expect(actions).toContain("Leads CRM");
    
    // MARKETING should NOT see CMS tools
    expect(actions).not.toContain("New Blog Post");
    expect(actions).not.toContain("Upload Media");
    expect(actions).not.toContain("Manage Menus");
    expect(actions).not.toContain("Manage Pages");
    
    expect(actions.length).toBe(2);
  });

  it("AUTHOR role - sees author and viewer items", () => {
    const actions = filterActionsForRole("AUTHOR").map((a) => a.label);
    
    expect(actions).toContain("System Status");
    expect(actions).toContain("New Blog Post");
    expect(actions).toContain("Upload Media");
    expect(actions).toContain("Edit Blogs");
    
    // AUTHOR should NOT see EDITOR+ tools
    expect(actions).not.toContain("Manage Menus");
    expect(actions).not.toContain("Manage Pages");
    expect(actions).not.toContain("Leads CRM"); // Leads CRM is EDITOR (and MARKETING)
    
    expect(actions.length).toBe(4);
  });

  it("EDITOR role - sees editor, author, and viewer items", () => {
    const actions = filterActionsForRole("EDITOR").map((a) => a.label);
    
    expect(actions).toContain("System Status");
    expect(actions).toContain("New Blog Post");
    expect(actions).toContain("Upload Media");
    expect(actions).toContain("Edit Blogs");
    expect(actions).toContain("Manage Menus");
    expect(actions).toContain("Manage Pages");
    expect(actions).toContain("Leads CRM");
    
    // EDITOR should NOT see ADMIN+ tools
    expect(actions).not.toContain("Database Backup");
    expect(actions).not.toContain("Security Console");
    
    expect(actions.length).toBe(7);
  });

  it("ADMIN role - sees all items", () => {
    const actions = filterActionsForRole("ADMIN").map((a) => a.label);
    expect(actions.length).toBe(allActions.length);
    expect(actions).toContain("Database Backup");
    expect(actions).toContain("Security Console");
  });

  it("SUPERADMIN role - sees all items", () => {
    const actions = filterActionsForRole("SUPERADMIN").map((a) => a.label);
    expect(actions.length).toBe(allActions.length);
  });
});
