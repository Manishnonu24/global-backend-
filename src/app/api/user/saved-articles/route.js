import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";
import { requireFrontendAuth } from "@/lib/requireFrontendAuth";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  return await requireFrontendAuth();
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const siteId = getSiteId(req);

    const savedArticles = await prisma.savedarticle.findMany({
      where: {
        userId: user.id,
        post: { siteId }
      },
      include: {
        post: {
          include: {
            categories: true,
            tags: true,
            featuredImage: true,
            author: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const articles = savedArticles.map(sa => sa.post);

    return NextResponse.json(apiSuccess({ articles }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { postId, articleData } = body;

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    let post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      const siteId = getSiteId(req) || 'AHP';
      // Create stub post
      post = await prisma.post.create({
        data: {
          id: postId,
          siteId,
          title: articleData?.title || 'Saved Article',
          slug: articleData?.slug || postId,
          status: 'PUBLISHED',
          excerpt: articleData?.excerpt || '',
          seoTitle: articleData?.title,
          // Ensure featuredImage logic isn't strictly required or handle later
        }
      });
    }

    const existing = await prisma.savedarticle.findFirst({
      where: { userId: user.id, postId }
    });

    if (!existing) {
      await prisma.savedarticle.create({
        data: { userId: user.id, postId: post.id }
      });
    }

    return NextResponse.json(apiSuccess({ message: "Article saved" }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    await prisma.savedarticle.deleteMany({
      where: { userId: user.id, postId }
    });

    return NextResponse.json(apiSuccess({ message: "Article removed" }));
  } catch (err) {
    return handleApiError(err);
  }
}
