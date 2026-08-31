import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { z } from "zod";
import { apiSuccess } from "@/core/errors";

const RedirectCreateSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.union([z.literal(301), z.literal(302)]).optional().default(301)
});

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const redirects = await prisma.redirect.findMany({
      where: { siteId: auth.siteId }
    });

    return NextResponse.json(apiSuccess({ redirects }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = RedirectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues || parsed.error.errors }, { status: 400 });
    }

    const { source, target, type } = parsed.data;

    // Check if redirect already exists
    const existing = await prisma.redirect.findUnique({
      where: {
        siteId_source: {
          siteId: auth.siteId,
          source
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "A redirect for this source path already exists" }, { status: 409 });
    }

    const redirect = await prisma.redirect.create({
      data: {
        siteId: auth.siteId,
        source,
        target,
        type
      }
    });

    return NextResponse.json(apiSuccess({ redirect }), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
