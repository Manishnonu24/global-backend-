import { NextResponse } from "next/server";
import { legalPageService } from "@/services/legalPage.service";
import { apiSuccess } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req, context) {
  try {
    const params = await context.params;
    const type = params?.type;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId || !type) {
      return NextResponse.json(
        { error: "siteId and type parameters are required" },
        { status: 400 },
      );
    }

    try {
      const preview = searchParams.get("preview") === "true";
      // Only return the legal page if it has been published from the dashboard (unless previewing)
      const legalPage = preview
        ? await legalPageService.getPageByType(siteId, type)
        : await legalPageService.getPublishedPageByType(siteId, type);
      if (!legalPage) {
        return NextResponse.json(
          { error: "Legal page not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(apiSuccess({ legalPage }));
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid Parameter", message: err.message },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
