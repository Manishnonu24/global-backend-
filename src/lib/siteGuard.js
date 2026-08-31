import { resolveSiteId } from "./siteResolver";

export function getSiteId(req) {
  return resolveSiteId(req);
}
