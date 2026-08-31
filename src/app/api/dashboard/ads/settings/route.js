import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { apiSuccess, handleApiError } from '@/core/errors';

export async function GET(req) {
  const auth = await checkSitePermission(req, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { adSettings: true }
    });

    return NextResponse.json(apiSuccess({ adSettings: settings?.adSettings || {} }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { adsensePublisherId, autoAdsEnabled } = body;

    const existing = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { adSettings: true }
    });

    const currentAdSettings = existing?.adSettings || {};

    const updatedAdSettings = {
      ...currentAdSettings,
      adsensePublisherId: adsensePublisherId !== undefined ? adsensePublisherId : currentAdSettings.adsensePublisherId,
      autoAdsEnabled: autoAdsEnabled !== undefined ? autoAdsEnabled : currentAdSettings.autoAdsEnabled,
    };

    const updated = await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: { adSettings: updatedAdSettings },
      create: { siteId: auth.siteId, adSettings: updatedAdSettings }
    });

    return NextResponse.json(apiSuccess({ adSettings: updated.adSettings }));
  } catch (err) {
    return handleApiError(err);
  }
}
