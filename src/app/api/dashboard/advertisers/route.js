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
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const advertisers = await prisma.advertiser.findMany({
      where: { siteId: auth.siteId },
      orderBy: { companyName: 'asc' },
    });
    return NextResponse.json(apiSuccess({ advertisers }));
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
    const data = AdvertiserSchema.parse(body);
    const advertiser = await prisma.advertiser.create({
      data: {
        siteId: auth.siteId,
        companyName: data.companyName,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        logo: data.logo || null,
        status: data.status,
      },
    });
    return NextResponse.json(apiSuccess({ advertiser }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
