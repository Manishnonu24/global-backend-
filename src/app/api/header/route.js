import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";
import { getSiteId } from "@/lib/siteGuard";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || getSiteId(req);

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { header: true, websiteSettings: true }
    });

    const header = settings?.header || {};
    const websiteSettings = settings?.websiteSettings || {};
    const logoUrl = header.logoUrl || websiteSettings.logoUrl || null;

    return NextResponse.json(apiSuccess({
      header: {
        ...header,
        logoUrl
      }
    }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
