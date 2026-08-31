import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Safe Env listing (masking sensitive credentials)
    const safeEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? "mysql://*****" : "Not set",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not set",
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME
        ? "Configured"
        : "Not set",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY
        ? "Configured"
        : "Not set",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
        ? "Configured"
        : "Not set",
      S3_ENDPOINT: process.env.S3_ENDPOINT || "Not set",
      S3_REGION: process.env.S3_REGION || "Not set",
      S3_BUCKET: process.env.S3_BUCKET || "Not set",
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ? "Configured" : "Not set",
      S3_SECRET_KEY: process.env.S3_SECRET_KEY ? "Configured" : "Not set",
      SMTP_HOST: process.env.SMTP_HOST || "Not set",
      SMTP_PORT: process.env.SMTP_PORT || "Not set",
    };

    return NextResponse.json(apiSuccess({ env: safeEnv }));
  } catch (err) {
    return handleApiError(err);
  }
}
