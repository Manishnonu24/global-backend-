import { logger } from "@/lib/logger";
import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const logId = searchParams.get("logId");
  const pushId = searchParams.get("pushId");
  const targetUrl = searchParams.get("url");

  // Track email campaign click
  if (logId) {
    try {
      const log = await prisma.campaignLog.findUnique({
        where: { id: logId }
      });
      if (log) {
        const updateData = {
          status: "clicked",
          clickedAt: log.clickedAt || new Date()
        };
        if (!log.openedAt) {
          updateData.openedAt = new Date();
        }
        
        await prisma.campaignLog.update({
          where: { id: logId },
          data: updateData
        });
      }
    } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      console.error("[TrackClick] Error updating campaignLog:", err.message);
    }
  }

  // Track push notification click
  if (pushId) {
    try {
      await prisma.pushNotification.update({
        where: { id: pushId },
        data: {
          clickedCount: { increment: 1 }
        }
      });
    } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      console.error("[TrackClick] Error updating pushNotification clickedCount:", err.message);
    }
  }

  const origin = new URL(request.url).origin;
  const redirectUrl = targetUrl || `${origin}/`;
  return NextResponse.redirect(redirectUrl, 302);
}

export const dynamic = "force-dynamic";
