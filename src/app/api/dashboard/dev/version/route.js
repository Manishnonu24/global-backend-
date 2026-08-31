import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import prisma from "@/lib/prisma";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Version details and history
    const versionHistory = [
      {
        version: "1.0.0",
        releaseDate: "2026-06-19",
        changes:
          "Initial release of multi-site Global Backend with 28 modules",
      },
    ];

    // Fetch stored deployment notes if any exist
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { deploymentNotes: true },
    });

    return NextResponse.json(
      apiSuccess({
        currentVersion: "1.0.0",
        buildTime: new Date().toISOString(),
        history: versionHistory,
        deploymentNotes: settings?.deploymentNotes || [],
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json(
        { error: "Deployment note text is required" },
        { status: 400 },
      );
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { deploymentNotes: true },
    });

    const existingNotes = settings?.deploymentNotes || [];
    const newNote = {
      id: `dep_${Date.now()}`,
      text: note.trim(),
      version: "1.0.0",
      author: auth.user?.email || "admin",
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [newNote, ...existingNotes].slice(0, 50);

    await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: { deploymentNotes: updatedNotes },
      create: { siteId: auth.siteId, deploymentNotes: updatedNotes },
    });

    return NextResponse.json(apiSuccess({ deploymentNotes: updatedNotes }), {
      status: 201,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
