import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { websiteSettings: true }
    });

    const custom404 = settings?.websiteSettings?.custom404 || {
      enabled: true,
      title: "Page Not Found",
      description: "Oops! The page you are looking for does not exist.",
      buttonText: "Go Home",
      buttonLink: "/",
      redirectOn404: false,
      redirectUrl: "/",
      redirectDelay: 5
    };

    return NextResponse.json(apiSuccess({ custom404 }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
