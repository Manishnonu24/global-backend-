import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getRequestId } from "@/lib/observability/requestContext";


export const dynamic = "force-dynamic";

// GET /api/dashboard/quizzes — list all questions with analytics counts
export async function GET(req) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const categoryFilter = searchParams.get("category");

    const where = categoryFilter
      ? categoryFilter === "general-wellness"
        ? { OR: [{ category: "general-wellness" }, { category: null }] }
        : { category: categoryFilter }
      : {};

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { id: "asc" },
    });

    // Attach play count per question
    const analytics = await prisma.quizAnalytics.groupBy({
      by: ["quizId"],
      _count: { id: true },
    });
    const countMap = Object.fromEntries(analytics.map((a) => [a.quizId, a._count.id]));

    const data = quizzes.map((q) => ({
      ...q,
      category: q.category || "general-wellness",
      playCount: countMap[q.id] ?? 0,
      options: (() => {
        try {
          const parsed = JSON.parse(q.options);
          return Array.isArray(parsed) ? parsed : q.options.split(",").map((o) => o.trim());
        } catch {
          return q.options.split(",").map((o) => o.trim());
        }
      })(),
    }));

    return NextResponse.json(data);
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "GET /api/dashboard/quizzes error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/dashboard/quizzes — create a new question
export async function POST(req) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { question, options, correctAnswer, explanation, category } = body;

    if (!question || !options || correctAnswer === undefined || correctAnswer === "") {
      return NextResponse.json({ error: "question, options, and correctAnswer are required" }, { status: 400 });
    }

    const optionsJson = JSON.stringify(
      Array.isArray(options) ? options : options.split(",").map((o) => o.trim())
    );

    const quiz = await prisma.quiz.create({
      data: {
        question: question.trim(),
        options: optionsJson,
        correctAnswer: String(correctAnswer),
        explanation: (explanation || "").trim(),
        category: (category || "general-wellness").trim(),
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "POST /api/dashboard/quizzes error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
