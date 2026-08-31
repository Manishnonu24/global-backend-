import { getLayoutData } from "@/services/layout.service";

export const dynamic = "force-dynamic";

function getMimeType(url) {
  if (!url) return "image/x-icon";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".webp")) return "image/png";
  if (cleanUrl.endsWith(".svg")) return "image/svg+xml";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "image/jpeg";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  return "image/x-icon";
}

export async function GET(request) {
  try {
    const layout = await getLayoutData();
    const faviconUrl = layout?.faviconUrl;

    if (faviconUrl && faviconUrl !== "/favicon.ico") {
      const origin = request.nextUrl.origin;
      const targetUrl = faviconUrl.startsWith("/") ? `${origin}${faviconUrl}` : faviconUrl;

      try {
        const res = await fetch(targetUrl, { cache: "no-store" });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || getMimeType(faviconUrl);
          const arrayBuffer = await res.arrayBuffer();
          return new Response(Buffer.from(arrayBuffer), {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, must-revalidate",
            },
          });
        }
      } catch (fetchErr) {
        console.error("[Favicon Route] Error fetching remote favicon image:", fetchErr);
      }
    }
  } catch (error) {
    console.error("[Favicon Route] Error resolving dynamic favicon:", error);
  }

  // Fallback to local public/favicon.ico
  try {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(process.cwd(), "public", "favicon.ico");
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/x-icon",
          "Cache-Control": "public, max-age=86400, must-revalidate",
        },
      });
    }
  } catch (e) {
    // Ignore fallback read error
  }

  return new Response(null, { status: 404 });
}
