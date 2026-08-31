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
      select: { compliance: true }
    });

    const compliance = settings?.compliance || {};
    const logs = compliance.consentLogs || [];

    return NextResponse.json(apiSuccess({ logs }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { siteId, visitorId, consentType, accepted } = body;

    if (!siteId || !visitorId || !consentType) {
      return NextResponse.json({ error: "siteId, visitorId, and consentType are required" }, { status: 400 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { compliance: true }
    });

    const compliance = settings?.compliance || {};
    const consentLogs = compliance.consentLogs || [];

    consentLogs.unshift({
      visitorId,
      consentType,
      accepted: !!accepted,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 logs in configuration
    const updatedLogs = consentLogs.slice(0, 100);

    await prisma.globalSettings.upsert({
      where: { siteId },
      update: {
        compliance: {
          ...compliance,
          consentLogs: updatedLogs
        }
      },
      create: {
        siteId,
        compliance: {
          consentLogs: updatedLogs
        }
      }
    });

    return NextResponse.json(apiSuccess({ message: "Consent recorded successfully" }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
