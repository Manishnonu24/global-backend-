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
    const { backup } = await req.json();
    
    let result;
    if (backup && (backup.media || backup.folders)) {
      result = await backupService.restoreMediaBackup(auth.siteId, backup);
    } else {
      result = await backupService.restoreBackup(auth.siteId, backup);
    }

    return NextResponse.json(apiSuccess({ message: backup && (backup.media || backup.folders)
        ? "Site media snapshot restored successfully from backup"
        : "Site database restored successfully from backup" }));
  } catch (err) {
    return handleApiError(err);
  }
}

