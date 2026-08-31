import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { apiSuccess, handleApiError } from '@/core/errors';

export async function PUT(req, { params }) {
  try {
    const auth = await checkSitePermission(req, 'EDITOR');
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await req.json();

    if (body.isFeatured) {
      await prisma.communityEvent.updateMany({
        where: { siteId: auth.siteId, isFeatured: true, NOT: { id } },
        data: { isFeatured: false }
      });
    }

    const event = await prisma.communityEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.eventDate !== undefined && { eventDate: body.eventDate }),
        ...(body.eventTime !== undefined && { eventTime: body.eventTime }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.reservedSeats !== undefined && { reservedSeats: Number(body.reservedSeats) }),
        ...(body.totalSeats !== undefined && { totalSeats: Number(body.totalSeats) }),
        ...(body.isFeatured !== undefined && { isFeatured: Boolean(body.isFeatured) }),
        ...(body.status !== undefined && { status: body.status })
      }
    });

    return NextResponse.json(apiSuccess({ event }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await checkSitePermission(req, 'EDITOR');
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    await prisma.communityEvent.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ message: 'Event deleted successfully' }));
  } catch (err) {
    return handleApiError(err);
  }
}
