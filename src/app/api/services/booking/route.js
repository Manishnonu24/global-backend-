import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestId } from "@/lib/observability/requestContext";

import {
  triggerServiceBooked,
  triggerServiceBookedAdminAlert,
} from '@/lib/novu-service-events';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      fullName,
      professionalTitle,
      email,
      productInfo,
      websiteUrl,
      phone,
      location,
      mediaPackage,
      timeline,
      story
    } = body;

    const prodInfo = productInfo || websiteUrl || 'N/A';

    if (!fullName || !email || !phone || !mediaPackage || !timeline || !story) {
      return NextResponse.json({ success: false, error: 'Required fields are missing (Full Name, Email, Phone, Media Package, Timeline, and Story are required).' }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { checkRateLimit } = await import("@/lib/rateLimiter");
    const allowed = await checkRateLimit(ip, 10);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too Many Requests: Rate limit exceeded' }, { status: 429 });
    }

    // Use the configured site ID from environment
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || 'AHP';

    const messageText = `
Professional Title: ${professionalTitle || 'N/A'}
Products / Services Info: ${prodInfo}
Phone: ${phone || 'N/A'}
State & Country: ${location || 'N/A'}
Requested Media Package: ${mediaPackage}
Desired Timeline: ${timeline}
About Story / Brand Mission: ${story}
    `;

    // Create Lead for CRM tracking — Service Booking Prospect
    const lead = await prisma.lead.create({
      data: {
        siteId,
        name: fullName,
        email,
        phone: phone || '',
        serviceInterest: mediaPackage,
        sourcePage: 'Services Booking Form',
        status: 'new',
        notes: messageText
      }
    });

    // 3. Create Dashboard Notification Alert for Topbar & CRM Bell
    try {
      const { notificationService } = await import('@/services/notification.service');
      await notificationService.notifyNewLead(siteId, lead);
    } catch (notifErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(notifErr, { tags: { requestId: _reqId } });
    logger.error({ err: notifErr, requestId: _reqId }, 'Failed to log lead notification alert via service:');
      try {
        await prisma.notificationAlert.create({
          data: {
            siteId,
            title: "New Service Booking Request",
            message: `${fullName} requested ${mediaPackage}`,
            type: "NEW_LEAD"
          }
        });
      } catch (e) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
        Sentry.captureException(e, { tags: { requestId: _reqId } });
    logger.error({ err: e, requestId: _reqId }, "Failed to create fallback notification alert:");
      }
    }

    // 4. Email to the team
    try {
      const { systemEmailQueue } = await import('@/lib/queues/systemEmailQueue');
      await systemEmailQueue.add(
        "media-booking-alert",
        {
          siteId,
          to: 'info@ahealthplace.com',
          subject: `New Media Booking Request: ${fullName} - ${mediaPackage}`,
          text: `You have received a new media package inquiry:\n\nClient: ${fullName}\nEmail: ${email}\n${messageText}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #0f4c4e; border-bottom: 2px solid #0f4c4e; padding-pb: 8px;">New Media Booking Request</h2>
              <p><strong>Client Name:</strong> ${fullName}</p>
              <p><strong>Email Address:</strong> ${email}</p>
              <p><strong>Phone Number:</strong> ${phone || 'N/A'}</p>
              <p><strong>Professional Title:</strong> ${professionalTitle || 'N/A'}</p>
              <p><strong>Products / Services Info:</strong> ${prodInfo}</p>
              <p><strong>Location (State & Country):</strong> ${location || 'N/A'}</p>
              <p><strong>Requested Media Package:</strong> ${mediaPackage}</p>
              <p><strong>Timeline:</strong> ${timeline}</p>
              <h3 style="color: #0f4c4e; margin-top: 20px;">Story / Brand Mission:</h3>
              <p style="background: #f7f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #1c7b80;">
                ${story.replace(/\n/g, '<br />')}
              </p>
            </div>
          `
        },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      );
    } catch (emailErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(emailErr, { tags: { requestId: _reqId } });
    logger.error({ err: emailErr, requestId: _reqId }, 'Failed to queue notification email to team:');
      // Do not fail request if email failed, as database save succeeded
    }

    // 4. Trigger Novu notifications via centralized helper
    try {
      // a) Customer confirmation notification
      await triggerServiceBooked(siteId, lead);

      // b) PR / Admin alert notification
      const settings = await prisma.globalSettings.findUnique({
        where: { siteId },
        select: { emailSettings: true }
      });
      const emailConfig = settings?.emailSettings || {};
      const prAlertsConfig = emailConfig.prAlerts || {};
      const prAlertsEnabled = prAlertsConfig.enabled !== false;
      const prEmail = prAlertsConfig.email || process.env.PR_TEAM_EMAIL || "manish.yadav@difm.tech";

      if (prAlertsEnabled && prEmail) {
        // Use a well-known subscriber ID for the PR team
        await triggerServiceBookedAdminAlert(
          siteId,
          lead,
          null,          // no service record — booking is package-based
          "pr-team",    // stable admin subscriber ID
          prEmail,
          "PR Team"
        );
      }
    } catch (novuErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(novuErr, { tags: { requestId: _reqId } });
    logger.error({ err: novuErr, requestId: _reqId }, 'Failed to trigger Novu notifications:');
    }

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'POST /api/services/booking error:');
    return NextResponse.json({ success: false, error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
