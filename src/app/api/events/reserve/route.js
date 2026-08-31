import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/core/errors';

export async function POST(req) {
  try {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'AHP';
    const body = await req.json();
    const { eventId, name, email, phone, seats = 1 } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
    }

    let event = null;
    if (eventId) {
      event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
    }

    if (!event) {
      event = await prisma.communityEvent.findFirst({
        where: { siteId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });
    }

    const seatsToReserve = Math.max(Number(seats) || 1, 1);

    if (event) {
      const updatedEvent = await prisma.communityEvent.update({
        where: { id: event.id },
        data: {
          reservedSeats: Math.min(event.reservedSeats + seatsToReserve, event.totalSeats)
        }
      });
      event = updatedEvent;
    }

    try {
      await prisma.lead.create({
        data: {
          siteId,
          name,
          email,
          phone: phone || null,
          serviceInterest: `Event Reservation: ${event?.title || 'Community Event'}`,
          sourcePage: 'Homepage Event Card',
          status: 'new',
          notes: `Reserved ${seatsToReserve} seat(s) for event: ${event?.title || 'Community Event'}`
        }
      });
    } catch (leadErr) {
      console.warn("Lead record creation warning:", leadErr.message);
    }

    return NextResponse.json(apiSuccess({
      message: 'Spot reserved successfully!',
      event
    }));
  } catch (err) {
    return handleApiError(err);
  }
}
