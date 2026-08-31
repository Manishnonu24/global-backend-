// Patch global fetch to automatically skip ngrok browser warnings
// and provide more helpful error messages when HTML is returned instead of JSON.
if (typeof globalThis.fetch !== "undefined") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (url, options) {
    const urlStr = url.toString();
    const isNgrok = urlStr.includes("ngrok-free.dev") || urlStr.includes("ngrok.io");

    let fetchOptions = options || {};
    if (isNgrok) {
      // Clone/initialize headers to inject ngrok skip browser warning
      const headers = { ...fetchOptions.headers };
      headers["ngrok-skip-browser-warning"] = "true";
      fetchOptions = { ...fetchOptions, headers };
    }

    const res = await originalFetch(url, fetchOptions);
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const originalJson = res.json.bind(res);
      res.json = async () => {
        const clonedRes = res.clone();
        try {
          return await originalJson();
        } catch (err) {
          const bodyText = await clonedRes.text().catch(() => "");
          let details = "";
          if (bodyText.includes("ERR_NGROK_3200")) {
            details = " (ngrok tunnel is offline/not found)";
          } else if (bodyText.includes("ERR_NGROK_3204")) {
            details = " (ngrok tunnel is not forwarding to any local port)";
          } else if (bodyText.includes("Tunnel") && bodyText.includes("not found")) {
            details = " (ngrok tunnel not found)";
          }
          throw new Error(
            `Expected JSON response but received HTML${details}. Status: ${res.status}. Please make sure your backend/tunnel is running.`
          );
        }
      };
    }

    return res;
  };
}

// Abort fetch after this many ms when the backend is unreachable
const FETCH_TIMEOUT = 15_000;

class CMSClient {
  constructor({ baseUrl, siteId }) {
    this.baseUrl = baseUrl?.replace(/\/+$/, "") || "";
    this.siteId = siteId;
  }

  async _request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const headers = {
        "content-type": "application/json",
        ...(this.siteId ? { "x-site-id": this.siteId } : {}),
        ...options.headers,
      };

      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      if (!res.ok) {
        throw new Error(`CMS request failed: ${res.status} ${res.statusText}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  getPosts(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.set("page", options.page);
    if (options.limit) params.set("limit", options.limit);
    if (options.search) params.set("search", options.search);
    const qs = params.toString();
    return this._request(`/api/posts${qs ? "?" + qs : ""}`);
  }

  async getPostBySlug(slug) {
    if (!slug || slug === "undefined") return { post: null };
    return this._request(`/api/posts/${slug}`);
  }

  async getMagazines(options = {}) {
    const params = new URLSearchParams();
    if (options.siteId) params.set("siteId", options.siteId);
    const qs = params.toString();
    const data = await this._request(`/api/magazine${qs ? "?" + qs : ""}`);
    const list = Array.isArray(data) ? data : [];

    const magazines = list.map(item => ({
      id: item.id,
      magazineId: item.magazine_id,
      title: item.magazine_title,
      description: item.magazine_description,
      introduction: item.magazine_introduction,
      tags: item.magazine_tags,
      coverImage: item.magazine_cover_image,
      backImage: item.magazine_back_image,
      spineImage: item.magazine_spine_image,
      link: item.magazine_link,
      date: item.magazine_date,
      category: item.magazine_category,
      magCloudLink: item.MagCloudLink,
      slug: item.magazine_slug,
      status: item.status,
    }));

    return { magazines };
  }

  async getMagazineBySlug(slug) {
    if (!slug || slug === "undefined") return { magazine: null };
    const data = await this._request(`/api/magazine/${slug}`);
    if (!data) return { magazine: null };

    const magazine = {
      id: data.id,
      magazineId: data.magazine_id,
      title: data.magazine_title,
      description: data.magazine_description,
      introduction: data.magazine_introduction,
      tags: data.magazine_tags,
      coverImage: data.magazine_cover_image,
      backImage: data.magazine_back_image,
      spineImage: data.magazine_spine_image,
      link: data.magazine_link,
      date: data.magazine_date,
      category: data.magazine_category,
      magCloudLink: data.MagCloudLink,
      slug: data.magazine_slug,
      status: data.status,
    };

    return { magazine };
  }
}

export const cms = new CMSClient({
  baseUrl: process.env.NEXT_PUBLIC_CMS_BASE_URL ||
    (typeof window === "undefined"
      ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
      : window.location.origin),
  siteId: process.env.NEXT_PUBLIC_SITE_ID || "AHP",
});