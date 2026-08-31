/**
 * In-memory OTP Store for User Registration Email Verification
 * Uses global scope to persist across Next.js dev server reloads.
 */
if (!global.__pendingRegistrations) {
  global.__pendingRegistrations = new Map();
}

const pendingMap = global.__pendingRegistrations;

export function savePendingOtp(email, data) {
  const normalizedEmail = email.trim().toLowerCase();
  pendingMap.set(normalizedEmail, {
    ...data,
    email: normalizedEmail,
    createdAt: Date.now(),
  });
}

export function getPendingOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = pendingMap.get(normalizedEmail);
  if (!entry) return null;

  // Expire after 15 minutes
  if (Date.now() - entry.createdAt > 15 * 60 * 1000) {
    pendingMap.delete(normalizedEmail);
    return null;
  }

  return entry;
}

export function deletePendingOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();
  pendingMap.delete(normalizedEmail);
}
