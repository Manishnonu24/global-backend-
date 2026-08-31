import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import crypto from "crypto";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const site = await prisma.site.findUnique({
      where: { id: auth.siteId },
      select: { integrationKey: true }
    });

    return NextResponse.json(apiSuccess({ integrationKey: site?.integrationKey || null }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const newKey = `ikey_${crypto.randomBytes(24).toString("hex")}`;

    const site = await prisma.site.update({
      where: { id: auth.siteId },
      data: { integrationKey: newKey },
      select: { id: true, integrationKey: true }
    });

    return NextResponse.json(apiSuccess({ integrationKey: site.integrationKey }));
  } catch (err) {
    return handleApiError(err);
  }
}
