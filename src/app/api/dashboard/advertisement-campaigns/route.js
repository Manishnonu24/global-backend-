import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { z } from 'zod';
import { apiSuccess, handleApiError } from '@/core/errors';

const CampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(apiSuccess({ campaigns }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const data = CampaignSchema.parse(body);
    const campaign = await prisma.adCampaign.create({
      data: {
        siteId: auth.siteId,
        name: data.name,
        description: data.description || null,
        budget: data.budget || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
      },
    });
    return NextResponse.json(apiSuccess({ campaign }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
