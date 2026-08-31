import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError } from "@/core/errors";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function GET(req, { params }) {
  let targetPath = null;
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { pageId } = await params;

    // Disable draft mode
    const draft = await draftMode();
    if (draft && typeof draft.disable === "function") {
      draft.disable();
    }

    // Determine target path
    const url = new URL(req.url);
    const returnTo = url.searchParams.get("returnTo");

    if (returnTo) {
      if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        const targetUrl = new URL(returnTo, req.url);
        targetUrl.searchParams.delete("cmsPreview");
        targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      } else {
        targetPath = "/"; // Safe fallback
      }
    } else if (pageId === "0") {
      targetPath = `/dashboard/pages`;
    } else {
      targetPath = `/dashboard/pages/${pageId}/edit`;
    }

  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    return handleApiError(err);
  }

  if (targetPath) {
    redirect(targetPath);
  } else {
    return NextResponse.json({ error: "Could not determine target path" }, { status: 500 });
  }
}
