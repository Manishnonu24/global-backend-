import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "./prisma";

const userCache = new Map();
const USER_CACHE_TTL = 10000; // 10 seconds

export const requireAuth = cache(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  if (session.user.globalRole === "USER" || session.user.globalRole === "VISITOR" || !session.user.globalRole) {
    return null;
  }

  try {
    const now = Date.now();
    const cached = userCache.get(session.user.id);
    if (cached && now - cached.timestamp < USER_CACHE_TTL) {
      return cached.user;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    if (!user) return null;
    
    const fullUser = {
      ...session.user,
      ...user
    };

    userCache.set(session.user.id, { user: fullUser, timestamp: now });
    
    // Periodically clean up cache
    if (userCache.size > 1000) userCache.clear();
    
    return fullUser;
  } catch (err) {
    console.error("requireAuth database validation failed:", err);
    return null;
  }
});
