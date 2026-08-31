import { NextResponse } from "next/server";
import { postService } from "@/services/post.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "AUTHOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const posts = await postService.getPosts(auth.siteId, {
      status,
      categoryId,
    });

    return NextResponse.json(apiSuccess({ posts }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "AUTHOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    let { canonicalUrl, ogImage } = body;
    if (canonicalUrl !== undefined && canonicalUrl !== null) {
      if (typeof canonicalUrl !== "string") {
        return NextResponse.json({ error: "canonicalUrl must be a string" }, { status: 400 });
      }
      canonicalUrl = canonicalUrl.trim() || null;
    }
    if (ogImage !== undefined && ogImage !== null) {
      if (typeof ogImage !== "string") {
        return NextResponse.json({ error: "ogImage must be a string" }, { status: 400 });
      }
      ogImage = ogImage.trim() || null;
    }

    const postData = {
      ...body,
      canonicalUrl,
      ogImage,
    };

    const post = await postService.create(auth.siteId, postData, auth.user?.id);
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
      revalidatePath("/blogs");
      revalidatePath("/sitemap.xml");
    } catch {}
    return NextResponse.json(apiSuccess({ post }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
