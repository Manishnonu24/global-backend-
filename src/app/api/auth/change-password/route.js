import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { requireFrontendAuth } from "@/lib/requireFrontendAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  try {
    const user = await requireFrontendAuth({ allowDashboardFallback: true });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    await authService.changePassword(user.id, currentPassword, newPassword);

    return NextResponse.json(apiSuccess({ message: "Password updated successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}

