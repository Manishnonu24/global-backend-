import { NextResponse } from "next/server";
import { leadService } from "@/services/lead.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const csvContent = await leadService.exportLeadsToCsv(auth.siteId);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads_site_${auth.siteId}.csv"`
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}
