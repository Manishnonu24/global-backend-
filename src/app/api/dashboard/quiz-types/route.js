import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { queueUpsertContent } from "@/lib/queues/searchQueue";
import { getRequestId } from "@/lib/observability/requestContext";

export const dynamic = "force-dynamic";

// GET /api/dashboard/quiz-types — list all quiz types
export async function GET(request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const types = await prisma.quizType.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json(types);
  } catch (err) {
    const _reqId = getRequestId(request);
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err, requestId: _reqId }, "GET /api/dashboard/quiz-types error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/dashboard/quiz-types — create a quiz type
export async function POST(req) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(user.globalRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { slug, title, subtitle, description, category, categoryColor, imageUrl, icon, estimatedMinutes, difficulty } = body;

    if (!slug || !title || !description)
      return NextResponse.json({ error: "slug, title, and description are required" }, { status: 400 });

    const maxOrder = await prisma.quizType.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const qt = await prisma.quizType.create({
      data: {
        slug: slug.trim(),
        title: title.trim(),
        subtitle: (subtitle || "").trim() || null,
        description: description.trim(),
        category: (category || title).trim(),
        categoryColor: categoryColor || "#0f7c85",
        imageUrl: imageUrl || null,
        icon: icon || null,
        estimatedMinutes: Number(estimatedMinutes) || 5,
        difficulty: difficulty || "Beginner",
        sortOrder: nextOrder,
      },
    });

    await queueUpsertContent("quiz", qt.id.toString());

    return NextResponse.json({ success: true, data: qt }, { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(req);
    if (err.code === "P2002")
      return NextResponse.json({ error: "A quiz type with this slug already exists." }, { status: 409 });
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err, requestId: _reqId }, "POST /api/dashboard/quiz-types error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
