import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getRequestId } from "@/lib/observability/requestContext";


export const dynamic = "force-dynamic";

function getDailySeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle(array, seed) {
  const arr = [...array];
  let m = arr.length, t, i;
  let s = seed;
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    i = Math.floor(rnd * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

async function getHomePageQuizSettings() {
  const settings = await prisma.globalSettings.findFirst({
    select: { websiteSettings: true }
  });
  const websiteSettings = settings?.websiteSettings || {};
  return {
    homePageQuizIds: Array.isArray(websiteSettings.homePageQuizIds) 
      ? websiteSettings.homePageQuizIds.map(Number) 
      : [],
    autoRotateDaily: websiteSettings.autoRotateDaily !== false, // default true
    dailyQuestionCount: parseInt(websiteSettings.dailyQuestionCount || "5", 10),
  };
}

async function saveHomePageQuizSettings(newSettings) {
  const settings = await prisma.globalSettings.findFirst({
    select: { siteId: true, websiteSettings: true }
  });
  const siteId = settings?.siteId || "AHP";
  const websiteSettings = settings?.websiteSettings || {};
  const updatedSettings = {
    ...websiteSettings,
    ...newSettings
  };
  await prisma.globalSettings.upsert({
    where: { siteId },
    update: { websiteSettings: updatedSettings },
    create: { siteId, websiteSettings: updatedSettings }
  });
}

/**
 * GET  /api/dashboard/quizzes/home-page  — list home page questions + daily rotation settings
 * POST /api/dashboard/quizzes/home-page  — save home page question set & daily rotation settings
 */
export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await getHomePageQuizSettings();
    let rows = [];

    if (settings.autoRotateDaily || settings.homePageQuizIds.length === 0) {
      const allQuizzes = await prisma.quiz.findMany();
      if (allQuizzes.length > 0) {
        const dateStr = new Date().toISOString().split("T")[0];
        const seed = getDailySeed(dateStr);
        const shuffled = seededShuffle(allQuizzes, seed);
        rows = shuffled.slice(0, Math.min(settings.dailyQuestionCount, shuffled.length));
      }
    } else {
      rows = await prisma.quiz.findMany({
        where: { id: { in: settings.homePageQuizIds } },
        orderBy: { id: "asc" },
      });
    }

    const data = rows.map((q) => ({
      ...q,
      category: "home-page",
      options: (() => {
        try {
          const p = JSON.parse(q.options);
          return Array.isArray(p) ? p : q.options.split(",").map((o) => o.trim());
        } catch {
          return q.options.split(",").map((o) => o.trim());
        }
      })(),
    }));

    return NextResponse.json({
      success: true,
      questions: data,
      settings,
      todayDate: new Date().toISOString().split("T")[0],
    });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "GET /api/dashboard/quizzes/home-page error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(user.globalRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { questionIds, autoRotateDaily, dailyQuestionCount, action } = body;

    // Instant manual shuffle action
    if (action === "rotate_now") {
      const allQuizzes = await prisma.quiz.findMany();
      if (allQuizzes.length > 0) {
        const randomSeed = Math.floor(Math.random() * 1000000);
        const count = parseInt(dailyQuestionCount || "5", 10);
        const shuffled = seededShuffle(allQuizzes, randomSeed);
        const pickedIds = shuffled.slice(0, Math.min(count, shuffled.length)).map(q => q.id);
        
        await saveHomePageQuizSettings({
          homePageQuizIds: pickedIds,
          autoRotateDaily: true,
          dailyQuestionCount: count,
          lastRotatedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: "Selected a new set of random daily questions!",
          questionIds: pickedIds,
        });
      }
    }

    const newIds = Array.isArray(questionIds) ? questionIds.map(Number) : [];
    await saveHomePageQuizSettings({
      homePageQuizIds: newIds,
      autoRotateDaily: autoRotateDaily !== undefined ? Boolean(autoRotateDaily) : true,
      dailyQuestionCount: parseInt(dailyQuestionCount || "5", 10),
    });

    return NextResponse.json({
      success: true,
      added: newIds.length,
      settings: {
        autoRotateDaily: Boolean(autoRotateDaily),
        dailyQuestionCount: parseInt(dailyQuestionCount || "5", 10),
      }
    });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "POST /api/dashboard/quizzes/home-page error:");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
