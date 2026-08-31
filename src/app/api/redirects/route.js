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

    const sourceParam = searchParams.get("source");
    if (sourceParam) {
      const formattedSource = sourceParam.trim().startsWith("/")
        ? sourceParam.trim()
        : `/${sourceParam.trim()}`;

      const redirect = await prisma.redirect.findUnique({
        where: {
          siteId_source: {
            siteId,
            source: formattedSource
          }
        }
      });

      const response = NextResponse.json(apiSuccess({ redirect }));
      response.headers.set("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=30");
      return response;
    }

    const redirects = await prisma.redirect.findMany({
      where: { siteId }
    });

    const response = NextResponse.json(apiSuccess({ redirects }));
    response.headers.set("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=30");
    return response;
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
