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
  status: z.enum(['active', 'inactive']),
});

export async function PUT(req, { params }) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const data = CampaignSchema.parse(body);

    const existing = await prisma.adCampaign.findFirst({
      where: { id, siteId: auth.siteId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = await prisma.adCampaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        budget: data.budget || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
      },
    });
    return NextResponse.json(apiSuccess({ campaign }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const { id } = await params;
    const existing = await prisma.adCampaign.findFirst({
      where: { id, siteId: auth.siteId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    await prisma.adCampaign.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
