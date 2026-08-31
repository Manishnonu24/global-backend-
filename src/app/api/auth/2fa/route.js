import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { requireAuth } from "@/lib/requireAuth";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";
import QRCode from "qrcode";

async function getAuthenticatedUser() {
  const sessionUser = await requireAuth();
  if (sessionUser) return sessionUser;

  if (process.env.NODE_ENV === "development") {
    return await prisma.user.findFirst();
  }
  return null;
}

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { secret, otpauthUrl } = await authService.generate2FASecret(user.id);
    
    // Generate QR Code data URL
    let qrCode = "";
    if (otpauthUrl) {
      qrCode = await QRCode.toDataURL(otpauthUrl);
    }
    
    return NextResponse.json(apiSuccess({ secret, qrCode }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    await authService.verifyAndEnable2FA(user.id, token);
    return NextResponse.json(apiSuccess({ message: "2FA Enabled" }));
  } catch (err) {
    return handleApiError(err);
  }
}
