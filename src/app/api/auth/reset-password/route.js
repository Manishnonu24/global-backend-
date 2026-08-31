import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function PATCH(req) {
  try {
    const body = await req.json();
    await authService.executePasswordReset(body.token, body.newPassword);
    return NextResponse.json(apiSuccess({ message: "Password reset successful" }));
  } catch (err) {
    return handleApiError(err);
  }
}
