export function isSuperAdmin(user) {
  return user?.globalRole === "SUPERADMIN";
}

export function isAdmin(user) {
  return user?.globalRole === "SUPERADMIN" || user?.globalRole === "ADMIN";
}

export function canManageUsers(user) {
  return isAdmin(user);
}

export function canManageMedia(user) {
  return isAdmin(user);
}

export function canManagePages(user) {
  return isAdmin(user);
}

export function canManageBlogs(user) {
  return isAdmin(user) || user?.globalRole === "EDITOR";
}

export function canManageSettings(user) {
  return isSuperAdmin(user);
}
