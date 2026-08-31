import { NextResponse } from "next/server";
import { isFlipbookConfigured } from "@/lib/integrations/status";

/**
 * POST /api/media/flipbook-upload
 *
 * Optional external platform integration for MagCloudLink generation.
 * In-app PDF reading is handled natively via primary S3 storage.
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") || formData.get("file");
    const title = formData.get("title") || "Magazine Issue";
    const description = formData.get("description") || "";

    if (!file) {
      return NextResponse.json({ success: false, message: "No PDF file provided" }, { status: 400 });
    }

    if (!isFlipbookConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: "Flipbook upload is not configured.",
          code: "INTEGRATION_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const flipbookApiUrl =
      process.env.FLIPBOOK_API_URL ||
      process.env.NEXT_PUBLIC_FLIPBOOK_API_URL;

    const apiFormData = new FormData();
    apiFormData.append("pdf", file);
    apiFormData.append("title", title);
    if (description) apiFormData.append("description", description);

    const apiRes = await fetch(flipbookApiUrl, {
      method: "POST",
      body: apiFormData,
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json(
        { success: false, message: `Flipbook API server error (${apiRes.status}): ${errText}` },
        { status: apiRes.status }
      );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to reach Flipbook API server" },
      { status: 500 }
    );
  }
}
