import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const pages = await pageService.getList(auth.siteId, {
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          where: { isDeleted: false },
          orderBy: { order: "asc" }
        }
      }
    });

    return NextResponse.json(apiSuccess({ pages }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { title, slug, seoTitle, seoDescription } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const newPage = await pageService.create(auth.siteId, {
      title,
      slug,
      seoTitle,
      seoDescription,
    }, auth.userId || "SYSTEM");

    return NextResponse.json(apiSuccess({ page: newPage }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
