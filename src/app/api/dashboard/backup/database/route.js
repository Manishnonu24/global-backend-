import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { backupService } from "@/services/backup.service";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;
    const backupData = await backupService.createBackup(siteId);
    
    const size = JSON.stringify(backupData).length;
    const backupId = await backupService.logBackupHistory(siteId, "database", size);

    return NextResponse.json(apiSuccess({ backupId,
      message: "Database backup completed successfully",
      backup: backupData }));
  } catch (err) {
    return handleApiError(err);
  }
}

