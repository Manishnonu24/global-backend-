import { NextResponse } from "next/server";
import { complianceService } from "@/services/compliance.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import prisma from "@/lib/prisma";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (email) {
      const leadsCount = await prisma.lead.count({
        where: { siteId: auth.siteId, email },
      });

      const submissionsCount = await prisma.contactFormSubmission.count({
        where: { siteId: auth.siteId, email },
      });

      const newsletterCount = await prisma.newsletter.count({
        where: { siteId: auth.siteId, email },
      });

      return NextResponse.json(
        apiSuccess({
          email,
          counts: {
            email,
            leads: leadsCount,
            submissions: submissionsCount,
            newsletter: newsletterCount,
            visitors: 0, // VisitorLog does not store email — cannot search by email
            total: leadsCount + submissionsCount + newsletterCount,
          },
        }),
      );
    }

    // Retrieve previous data deletion logs
    const logs = await prisma.auditLog.findMany({
      where: {
        siteId: auth.siteId,
        action: "GDPR_DATA_DELETION",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(apiSuccess({ logs }));
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

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { error: "Email is required for data deletion" },
        { status: 400 },
      );
    }

    const result = await complianceService.purgeGdprData(
      auth.siteId,
      email,
      auth.user.id,
    );

    return NextResponse.json(
      apiSuccess({
        message: `GDPR data deletion processed successfully for ${email}`,
        details: result,
      }),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
