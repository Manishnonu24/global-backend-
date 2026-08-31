import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { backupService } from "@/services/backup.service";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const backupHistory = await backupService.getBackupHistory(auth.siteId);
    return NextResponse.json(apiSuccess({ backupHistory }));
  } catch (err) {
    return handleApiError(err);
  }
}

