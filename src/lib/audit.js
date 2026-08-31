import prisma from "@/lib/prisma";

import { logSystemError } from "@/core/errors";

export async function logAction(siteId, userId, action, meta = {}) {
  try {
    try {
      return await prisma.auditLog.create({
        data: { siteId, userId, action, meta },
      });
    } catch (innerErr) {
      if (innerErr.code === 'P2003' && userId) {
        // Foreign key constraint failed on userId, retry with null
        return await prisma.auditLog.create({
          data: { siteId, userId: null, action, meta: { ...meta, originalUserId: userId } },
        });
      }
      throw innerErr;
    }
  } catch (err) {
    // If audit logging fails, capture it as a system error so it shows on the dashboard
    logSystemError(`Audit log failed: ${err.message}`, err.stack, { action, meta, userId }, siteId).catch(() => {});
    throw err;
  }
}

export async function recordLogin(userId, ipAddress, userAgent, success = true) {
  return await prisma.loginHistory.create({
    data: { userId, ipAddress, userAgent, success },
  });
}
