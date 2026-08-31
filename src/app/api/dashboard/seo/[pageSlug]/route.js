import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req, context) {
  const params = await context.params;
  const pageSlug = params?.pageSlug;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const decodedSlug = decodeURIComponent(pageSlug);
    const formattedSlug = decodedSlug.startsWith("/")
      ? decodedSlug
      : `/${decodedSlug}`;

    // 1. Try to find Page
    const page = await prisma.page.findUnique({
      where: { siteId_slug: { siteId: auth.siteId, slug: formattedSlug } },
      select: { seoTitle: true, seoDescription: true, jsonLd: true, canonicalUrl: true, ogImage: true }
    });

    if (page) {
      return NextResponse.json(apiSuccess({
        type: "page",
        seoTitle: page.seoTitle || "",
        seoDescription: page.seoDescription || "",
        jsonLd: page.jsonLd || null,
        canonicalUrl: page.canonicalUrl || "",
        ogImage: page.ogImage || ""
      }));
    }

    // 2. Try to find blog Post
    const postSlug = formattedSlug.startsWith("/")
      ? formattedSlug.substring(1)
      : formattedSlug;
    const post = await prisma.post.findFirst({
      where: {
        siteId: auth.siteId,
        OR: [{ slug: postSlug }, { slug: formattedSlug }],
      },
      select: { seoTitle: true, seoDescription: true, jsonLd: true, canonicalUrl: true, ogImage: true }
    });

    if (post) {
      return NextResponse.json(apiSuccess({
        type: "post",
        seoTitle: post.seoTitle || "",
        seoDescription: post.seoDescription || "",
        jsonLd: post.jsonLd || null,
        canonicalUrl: post.canonicalUrl || "",
        ogImage: post.ogImage || ""
      }));
    }

    return NextResponse.json(apiSuccess({
      type: "none",
      seoTitle: "",
      seoDescription: "",
      jsonLd: null,
      canonicalUrl: "",
      ogImage: ""
    }));
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req, context) {
  const params = await context.params;
  const pageSlug = params?.pageSlug;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const decodedSlug = decodeURIComponent(pageSlug);
    const formattedSlug = decodedSlug.startsWith("/")
      ? decodedSlug
      : `/${decodedSlug}`;
    const body = await req.json();
    const { seoTitle, seoDescription, jsonLd, canonicalUrl, ogImage } = body;

    // 1. Try to find and update Page
    const page = await prisma.page.findUnique({
      where: { siteId_slug: { siteId: auth.siteId, slug: formattedSlug } },
    });

    if (page) {
      const updatedPage = await prisma.page.update({
        where: { id: page.id },
        data: {
          seoTitle: seoTitle !== undefined ? seoTitle : page.seoTitle,
          seoDescription:
            seoDescription !== undefined ? seoDescription : page.seoDescription,
          jsonLd: jsonLd !== undefined ? jsonLd : page.jsonLd,
          canonicalUrl:
            canonicalUrl !== undefined ? canonicalUrl : page.canonicalUrl,
          ogImage: ogImage !== undefined ? ogImage : page.ogImage,
        },
      });
      return NextResponse.json(apiSuccess({ type: "page", page: updatedPage }));
    }

    // 2. Try to find and update blog Post
    const postSlug = formattedSlug.startsWith("/")
      ? formattedSlug.substring(1)
      : formattedSlug;
    const post = await prisma.post.findFirst({
      where: {
        siteId: auth.siteId,
        OR: [{ slug: postSlug }, { slug: formattedSlug }],
      },
    });

    if (post) {
      const updatedPost = await prisma.post.update({
        where: { id: post.id },
        data: {
          seoTitle: seoTitle !== undefined ? seoTitle : post.seoTitle,
          seoDescription:
            seoDescription !== undefined ? seoDescription : post.seoDescription,
          jsonLd: jsonLd !== undefined ? jsonLd : post.jsonLd,
          canonicalUrl:
            canonicalUrl !== undefined ? canonicalUrl : post.canonicalUrl,
          ogImage: ogImage !== undefined ? ogImage : post.ogImage,
        },
      });
      return NextResponse.json(apiSuccess({ type: "post", post: updatedPost }));
    }

    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
