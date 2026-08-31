import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestId } from "@/lib/observability/requestContext";

export async function POST(req) {
  try {
    const body = await req.json();
    const { siteId: bodySiteId, question, name, email, pageSlug } = body;

    const siteId = bodySiteId || process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";

    if (!question || !question.trim() || question.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid question (at least 4 characters)." },
        { status: 400 }
      );
    }

    if (!name || !name.trim() || !email || !email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Your name and a valid email address are required." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { checkRateLimit } = await import("@/lib/rateLimiter");
    const allowed = await checkRateLimit(ip, 5);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too Many Requests: Please wait before submitting another question." },
        { status: 429 }
      );
    }

    // Resolve pageId if pageSlug is provided
    let pageId = null;
    if (pageSlug) {
      const cleanSlug = pageSlug.replace(/^\//, "");
      const pageObj = await prisma.page.findFirst({
        where: { siteId, slug: { in: [pageSlug, cleanSlug, `/${cleanSlug}`] }, deletedAt: null },
        select: { id: true }
      });
      if (pageObj) {
        pageId = pageObj.id;
      }
    }

    // 1. Create FAQ in database with showHide = false (Pending Admin Approval)
    const newFaq = await prisma.faq.create({
      data: {
        siteId,
        question: question.trim(),
        answer: "Pending admin review and answer.",
        pageId: pageId,
        showHide: false, // Unapproved / Hidden until admin approves in Dashboard FAQ Manager
        sortOrder: 999,
      }
    });

    // 2. Log a Lead for CRM tracking
    try {
      await prisma.lead.create({
        data: {
          siteId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          sourcePage: pageSlug || "FAQ Section",
          status: "new",
          notes: `User submitted FAQ question for review: "${question.trim()}"`
        }
      });
    } catch (_) { /* Non-critical if lead creation fails */ }

    // 3. Create Dashboard Alert for Admin Notification
    try {
      await prisma.notificationAlert.create({
        data: {
          siteId,
          title: "New FAQ Question Submitted",
          message: `${name.trim()} (${email.trim()}) asked: "${question.trim()}" (Pending approval)`,
          type: "NEW_LEAD"
        }
      });
    } catch (_) { /* Non-critical if alert creation fails */ }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your question has been submitted for review. It will appear once approved by our editorial team.",
      faqId: newFaq.id
    });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err, requestId: _reqId }, "POST /api/faqs/ask error:");
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
