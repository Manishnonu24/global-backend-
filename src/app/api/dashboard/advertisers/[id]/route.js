import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { z } from 'zod';
import { apiSuccess, handleApiError } from '@/core/errors';

const AdvertiserSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
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
    const data = AdvertiserSchema.parse(body);

    const existing = await prisma.advertiser.findFirst({
      where: { id, siteId: auth.siteId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 });
    }

    const advertiser = await prisma.advertiser.update({
      where: { id },
      data: {
        companyName: data.companyName,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        logo: data.logo || null,
        status: data.status,
      },
    });
    return NextResponse.json(apiSuccess({ advertiser }));
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
    const existing = await prisma.advertiser.findFirst({
      where: { id, siteId: auth.siteId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 });
    }
    await prisma.advertiser.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
