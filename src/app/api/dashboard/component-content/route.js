import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { getComponentContent, saveComponentContent } from "@/lib/componentContent";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const pageSlug = searchParams.get("pageSlug");
    const componentKey = searchParams.get("componentKey");

    if (!pageSlug || !componentKey) {
      return NextResponse.json({ error: "pageSlug and componentKey are required" }, { status: 400 });
    }

    const content = await getComponentContent(auth.siteId, pageSlug, componentKey, {});

    return NextResponse.json(apiSuccess({ content }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { pageSlug, componentKey, data } = body;

    if (!pageSlug || !componentKey || !data) {
      return NextResponse.json({ error: "pageSlug, componentKey, and data are required" }, { status: 400 });
    }

    const content = await saveComponentContent(auth.siteId, pageSlug, componentKey, data);

    return NextResponse.json(apiSuccess({ content: content.data }));
  } catch (err) {
    return handleApiError(err);
  }
}
