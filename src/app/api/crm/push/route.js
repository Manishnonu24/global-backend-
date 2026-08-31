import { NextResponse } from "next/server";
import { pushService } from "@/services/push.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const notifications = await pushService.getNotifications(auth.siteId);
    return NextResponse.json(apiSuccess({ notifications }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const notification = await pushService.createNotification(auth.siteId, body);
    return NextResponse.json(apiSuccess({ notification }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
    }
    const body = await req.json();
    const notification = await pushService.updateNotification(auth.siteId, id, body);
    return NextResponse.json(apiSuccess({ notification }));
  } catch (err) {
    return handleApiError(err);
  }
}
