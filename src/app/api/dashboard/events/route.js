import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { apiSuccess, handleApiError } from '@/core/errors';

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, 'EDITOR');
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const events = await prisma.communityEvent.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(apiSuccess({ events }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, 'EDITOR');
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    
    if (body.isFeatured) {
      await prisma.communityEvent.updateMany({
        where: { siteId: auth.siteId, isFeatured: true },
        data: { isFeatured: false }
      });
    }

    const event = await prisma.communityEvent.create({
      data: {
        siteId: auth.siteId,
        title: body.title || 'Sunrise Nature Walk & Mindful Meditation',
        category: body.category || 'OUTDOOR WELLNESS',
        description: body.description || '',
        imageUrl: body.imageUrl || '/images/hero_exercise.webp',
        eventDate: body.eventDate || 'Saturday, 15 Aug 2026',
        eventTime: body.eventTime || '7:30 AM – 9:30 AM',
        location: body.location || 'Botanical Nature Park, West Trailhead',
        tags: body.tags || 'Mindfulness, Fresh Air, Group Walk',
        reservedSeats: body.reservedSeats ? Number(body.reservedSeats) : 0,
        totalSeats: body.totalSeats ? Number(body.totalSeats) : 60,
        isFeatured: body.isFeatured ?? true,
        status: body.status || 'active'
      }
    });

    return NextResponse.json(apiSuccess({ event }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
