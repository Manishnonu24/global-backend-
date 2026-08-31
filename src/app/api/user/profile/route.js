import { NextResponse } from "next/server";
import { requireFrontendAuth } from "@/lib/requireFrontendAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

/**
 * Shapes a User record into a consistent user-facing profile object.
 */
function formatProfile(user) {
  return {
    id: String(user.id),
    name: user.name || "",
    email: user.email || "",
    bio: user.bio || "",
    image: user.image || "",
    socialLinks: user.socialLinks || null,
    createdAt: user.createdAt?.toISOString?.() || null,
  };
}

export async function GET() {
  try {
    const user = await requireFrontendAuth();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(apiSuccess({ user: formatProfile(user) }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  try {
    const user = await requireFrontendAuth();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, bio, image, socialLinks } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
        ...(socialLinks !== undefined && { socialLinks }),
      },
    });

    return NextResponse.json(apiSuccess({ user: formatProfile(updatedUser) }));
  } catch (err) {
    return handleApiError(err);
  }
}
