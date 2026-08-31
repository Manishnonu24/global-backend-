import { NextResponse } from "next/server";
import { legalPageService } from "@/services/legalPage.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const legalPages = await legalPageService.getAllActivePages(auth.siteId);
    return NextResponse.json(apiSuccess({ legalPages }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
