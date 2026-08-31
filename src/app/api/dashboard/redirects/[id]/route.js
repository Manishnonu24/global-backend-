import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { z } from "zod";
import { apiSuccess } from "@/core/errors";

const RedirectUpdateSchema = z.object({
  source: z.string().optional(),
  target: z.string().optional(),
  type: z.union([z.literal(301), z.literal(302)]).optional()
});

export async function GET(req, context) {
  const params = await context.params;
  const id = params?.id;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const redirect = await prisma.redirect.findFirst({
      where: { id, siteId: auth.siteId }
    });

    if (!redirect) {
      return NextResponse.json({ error: "Redirect not found" }, { status: 404 });
    }

    return NextResponse.json(apiSuccess({ redirect }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function PATCH(req, context) {
  const params = await context.params;
  const id = params?.id;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const redirect = await prisma.redirect.findFirst({
      where: { id, siteId: auth.siteId }
    });

    if (!redirect) {
      return NextResponse.json({ error: "Redirect not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = RedirectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues || parsed.error.errors }, { status: 400 });
    }

    const updated = await prisma.redirect.update({
      where: { id },
      data: parsed.data
    });

    return NextResponse.json(apiSuccess({ redirect: updated }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  const params = await context.params;
  const id = params?.id;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const redirect = await prisma.redirect.findFirst({
      where: { id, siteId: auth.siteId }
    });

    if (!redirect) {
      return NextResponse.json({ error: "Redirect not found" }, { status: 404 });
    }

    await prisma.redirect.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ message: "Redirect deleted successfully" }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
