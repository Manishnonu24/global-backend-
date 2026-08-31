import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess, NotFoundError } from "@/core/errors";
import prisma from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { versionService } from "@/services/version.service";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { getRequestId } from "@/lib/observability/requestContext";

/**
 * POST /api/dashboard/pages/:pageId/restore
 *
 * Restores a soft-deleted CMS page back to DRAFT status.
 * Only ADMINs can restore pages.
 */
export async function POST(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;

    // Find the page regardless of soft-delete state, but scoped to this site
    const page = await prisma.page.findFirst({
      where: { id: pageId, siteId: auth.siteId },
    });

    if (!page) {
      throw new NotFoundError("Page");
    }

    if (!page.deletedAt) {
      return NextResponse.json(
        { error: "Page is not deleted and cannot be restored" },
        { status: 400 }
      );
    }

    const restored = await prisma.page.update({
      where: { id: pageId },
      data: {
        deletedAt: null,
        status: "DRAFT",
        isEnabled: true,
        publishedAt: null,
        publishedBy: null,
      },
    });

    try {
      await logAction(auth.siteId, auth.user?.id || null, "PAGE_RESTORE", { pageId });
    } catch (e) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(e, { tags: { requestId: _reqId } });
    logger.error({ err: e, requestId: _reqId }, "Audit log failed (page restore):");
    }

    try {
      await versionService.savePageSnapshot(auth.siteId, pageId, auth.user?.id || null);
    } catch (e) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(e, { tags: { requestId: _reqId } });
    logger.error({ err: e, requestId: _reqId }, "Snapshot save failed (page restore):");
    }

    return NextResponse.json(apiSuccess({ page: restored }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    return handleApiError(err);
  }
}
