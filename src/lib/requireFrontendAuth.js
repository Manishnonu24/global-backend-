import { getServerSession } from "next-auth";
import { frontendAuthOptions } from "./frontendAuth";
import { authOptions } from "./auth";
import prisma from "./prisma";

/**
 * requireFrontendAuth
 * Reads the user session (from frontendAuthOptions or fallback authOptions)
 * and returns the full User record for the logged-in user.
 *
 * Returns null if no valid session exists.
 */
export async function requireFrontendAuth({ allowDashboardFallback = true } = {}) {
  try {
    let session = await getServerSession(frontendAuthOptions);
    if (!session?.user && allowDashboardFallback) {
      session = await getServerSession(authOptions);
    }

    if (!session?.user) return null;

    const userId = session.user.id;
    const userEmail = session.user.email;

    if (!userId && !userEmail) return null;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          userId ? { id: userId } : undefined,
          userEmail ? { email: userEmail } : undefined,
        ].filter(Boolean),
        isActive: true,
      },
    });

    return user || null;
  } catch (err) {
    console.error("[requireFrontendAuth] Error:", err);
    return null;
  }
}
