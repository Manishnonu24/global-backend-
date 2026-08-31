// src/lib/rbac.js

export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  AUTHOR: "AUTHOR",
  MARKETING: "MARKETING",
  VIEWER: "VIEWER",
  VISITOR: "VISITOR",
};

// numeric hierarchy
export const ROLE_LEVEL = {
  SUPERADMIN: 6,
  ADMIN: 5,
  EDITOR: 4,
  AUTHOR: 3,
  MARKETING: 2,
  VIEWER: 1,
  VISITOR: 0,
};

// Allow assigning roles up to and including the creator's role
export function canAssignRole(creatorRole, targetRole) {
  const c = ROLE_LEVEL[creatorRole] || 0;
  const t = ROLE_LEVEL[targetRole] || 0;
  return c >= t; // <-- allow equal or lower
}

// For deletion you may want stricter rules (optional):
export function canDeleteRole(creatorRole, targetRole) {
  const c = ROLE_LEVEL[creatorRole] || 0;
  const t = ROLE_LEVEL[targetRole] || 0;
  return c == 4 ? c >= t : c > t; // strict: creator must be higher than target
}

export function hasRole(userRole, requiredRole) {
  const u = ROLE_LEVEL[userRole] || 0;
  const r = ROLE_LEVEL[requiredRole] || 0;
  return u >= r;
}
