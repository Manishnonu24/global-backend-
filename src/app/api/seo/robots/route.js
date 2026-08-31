import { seoService } from "@/services/seo.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const robotsText = await seoService.getRobotsTxt(siteId);

    return new Response(robotsText, {
      headers: { "Content-Type": "text/plain" }
    });
  } catch (err) {
    return new Response("User-agent: *\nAllow: /", {
      headers: { "Content-Type": "text/plain" }
    });
  }
}
