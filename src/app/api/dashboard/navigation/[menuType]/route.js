import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req, context) {
  const params = await context.params;
  const menuType = params?.menuType;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { navigation: true }
    });

    const navigation = settings?.navigation || {};
    const menuItems = navigation[menuType] || [];

    return NextResponse.json(apiSuccess({ menuType, items: menuItems }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function PUT(req, context) {
  const params = await context.params;
  const menuType = params?.menuType;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json(); // Array of menu items
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a menu items array" }, { status: 400 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { navigation: true }
    });

    const currentNavigation = settings?.navigation || {};
    const updatedNavigation = {
      ...currentNavigation,
      [menuType]: body
    };

    const updated = await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: { navigation: updatedNavigation },
      create: { siteId: auth.siteId, navigation: updatedNavigation }
    });

    return NextResponse.json(apiSuccess({ menuType, items: updated.navigation[menuType] }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
