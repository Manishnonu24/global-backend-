import { NextResponse } from "next/server";
import { postService } from "@/services/post.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "AUTHOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { postId } = await params;
    const post = await postService.getById(auth.siteId, postId, {
      include: {
        categories: true,
        tags: true,
        author: { select: { id: true, email: true } },
        featuredImage: true,
      }
    });

    return NextResponse.json(apiSuccess({ post }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "AUTHOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { postId } = await params;

    if (auth.user?.globalRole === "AUTHOR") {
      const existingPost = await postService.getById(auth.siteId, postId);
      if (existingPost.authorId !== auth.user?.id) {
        return NextResponse.json({ error: "Forbidden: You can only modify your own posts" }, { status: 403 });
      }
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

    const post = await postService.update(auth.siteId, postId, postData, auth.user?.id);
    return NextResponse.json(apiSuccess({ post }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "AUTHOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { postId } = await params;

    if (auth.user?.globalRole === "AUTHOR") {
      const existingPost = await postService.getById(auth.siteId, postId);
      if (existingPost.authorId !== auth.user?.id) {
        return NextResponse.json({ error: "Forbidden: You can only delete your own posts" }, { status: 403 });
      }
    }
    await postService.delete(auth.siteId, postId, auth.user?.id);

    return NextResponse.json(apiSuccess({ message: "Post deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
