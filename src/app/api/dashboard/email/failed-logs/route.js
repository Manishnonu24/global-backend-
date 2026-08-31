import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { emailSettings: true }
    });

    const emailSettings = settings?.emailSettings || {};
    const failedLogs = emailSettings.failedLogs || [];

    return NextResponse.json(apiSuccess({ failedLogs }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { emailSettings: true }
    });

    const currentEmailSettings = settings?.emailSettings || {};
    const updatedEmailSettings = {
      ...currentEmailSettings,
      failedLogs: []
    };

    await prisma.globalSettings.update({
      where: { siteId: auth.siteId },
      data: {
        emailSettings: updatedEmailSettings
      }
    });

    return NextResponse.json(apiSuccess({ message: "Failed email logs cleared successfully" }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

