
export default {
  async fetch(request, env, ctx) {
    const response = await env.ASSETS.fetch(request);

    const isPage =
      request.method === "GET" &&
      response.ok &&
      (
        request.headers.get("sec-fetch-dest") === "document" ||
        request.headers.get("accept")?.includes("text/html")
      );

    if (isPage) {
      ctx.waitUntil(recordVisit(request, env));
    }

    return response;
  },
};

async function recordVisit(request, env) {
  try {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const country = request.cf?.country || null;

    let browser = "Other";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua)) browser = "Safari";

    let os = "Other";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
    else if (/Linux/.test(ua)) os = "Linux";

    let device = "Desktop";
    if (/iPad|Tablet/.test(ua)) device = "Tablet";
    else if (/Mobile|iPhone|Android/.test(ua)) device = "Mobile";

    const rawReferrer = request.headers.get("referer");
    let referrer = null;

    if (rawReferrer) {
      try {
        const r = new URL(rawReferrer);
        referrer = r.hostname;
      } catch {}
    }

    await env.DB.prepare(`
      INSERT INTO page_visits
        (country, path, browser, os, device, referrer)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      country,
      url.pathname,
      browser,
      os,
      device,
      referrer
    ).run();
  } catch (error) {
    console.error("Visit logging failed:", error);
  }
}
