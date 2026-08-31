import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getRequestId } from "@/lib/observability/requestContext";


export const dynamic = "force-dynamic";

// PUT /api/dashboard/quizzes/[id] — update a question
export async function PUT(req, { params }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json();
    const { question, options, correctAnswer, explanation, category } = body;

    const optionsJson = JSON.stringify(
      Array.isArray(options) ? options : options.split(",").map((o) => o.trim())
    );

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        question: question.trim(),
        options: optionsJson,
        correctAnswer: String(correctAnswer),
        explanation: (explanation || "").trim(),
        category: (category || "general-wellness").trim(),
      },
    });

    return NextResponse.json(quiz);
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "PUT /api/dashboard/quizzes/[id] error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/dashboard/quizzes/[id] — delete a question
export async function DELETE(req, { params }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    // Delete associated analytics first
    await prisma.quizAnalytics.deleteMany({ where: { quizId: id } });
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "DELETE /api/dashboard/quizzes/[id] error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
