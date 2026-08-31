import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import crypto from "crypto";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const keys = await prisma.apiKey.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiSuccess({ apiKeys: keys }));
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Key name is required" },
        { status: 400 },
      );
    }

    // Generate random secure API key
    const rawKey = `gkey_${crypto.randomBytes(24).toString("hex")}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        siteId: auth.siteId,
        name,
        key: rawKey,
        isActive: true,
      },
    });

    return NextResponse.json(apiSuccess({ apiKey }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required to delete key" },
        { status: 400 },
      );
    }

    const key = await prisma.apiKey.findFirst({
      where: { id, siteId: auth.siteId },
    });

    if (!key) {
      return NextResponse.json({ error: "API Key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });

    return NextResponse.json(
      apiSuccess({ message: "API key revoked successfully" }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
