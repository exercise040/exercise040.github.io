
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isAdmin(request, env) {
  const expected = env.ADMIN_PASSWORD;
  const supplied = request.headers.get("X-Admin-Password");

  return Boolean(expected && supplied && supplied === expected);
}

async function handleApi(request, env) {
  const path = new URL(request.url).pathname;

  try {
    // Check whether the supplied password is correct.
    if (path === "/api/admin/verify" && request.method === "POST") {
      return isAdmin(request, env)
        ? json({ ok: true })
        : json({ error: "Incorrect password." }, 401);
    }

    // List all posts.
    if (path === "/api/posts" && request.method === "GET") {
      const result = await env.DB.prepare(`
        SELECT
          p.id,
          p.title,
          p.created_at,
          p.updated_at,
          COUNT(c.id) AS comment_count
        FROM memo_posts p
        LEFT JOIN memo_comments c ON c.post_id = p.id
        GROUP BY p.id
        ORDER BY p.id DESC
      `).all();

      return json(result.results);
    }

    // Create a post: password required.
    if (path === "/api/posts" && request.method === "POST") {
      if (!isAdmin(request, env)) {
        return json({ error: "Incorrect password." }, 401);
      }

      const data = await request.json();
      const title = cleanText(data.title, 200);
      const body = cleanText(data.body, 20000);

      if (!title || !body) {
        return json(
          { error: "Title and content are required." },
          400
        );
      }

      const result = await env.DB.prepare(`
        INSERT INTO memo_posts (title, body)
        VALUES (?, ?)
      `).bind(title, body).run();

      return json({ id: result.meta.last_row_id }, 201);
    }

    const postMatch = path.match(/^\/api\/posts\/(\d+)$/);

    // Read one post and its comments.
    if (postMatch && request.method === "GET") {
      const id = Number(postMatch[1]);

      const post = await env.DB.prepare(`
        SELECT id, title, body, created_at, updated_at
        FROM memo_posts
        WHERE id = ?
      `).bind(id).first();

      if (!post) {
        return json({ error: "Post not found." }, 404);
      }

      const comments = await env.DB.prepare(`
        SELECT id, author, body, created_at
        FROM memo_comments
        WHERE post_id = ?
        ORDER BY id ASC
      `).bind(id).all();

      return json({ post, comments: comments.results });
    }

    // Edit a post: password required.
    if (postMatch && request.method === "PATCH") {
      if (!isAdmin(request, env)) {
        return json({ error: "Incorrect password." }, 401);
      }

      const id = Number(postMatch[1]);
      const data = await request.json();
      const title = cleanText(data.title, 200);
      const body = cleanText(data.body, 20000);

      if (!title || !body) {
        return json(
          { error: "Title and content are required." },
          400
        );
      }

      const result = await env.DB.prepare(`
        UPDATE memo_posts
        SET title = ?,
            body = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `).bind(title, body, id).run();

      if (!result.meta.changes) {
        return json({ error: "Post not found." }, 404);
      }

      return json({ ok: true });
    }

    // Delete a post: password required.
    if (postMatch && request.method === "DELETE") {
      if (!isAdmin(request, env)) {
        return json({ error: "Incorrect password." }, 401);
      }

      const id = Number(postMatch[1]);

      await env.DB.batch([
        env.DB.prepare(
          "DELETE FROM memo_comments WHERE post_id = ?"
        ).bind(id),
        env.DB.prepare(
          "DELETE FROM memo_posts WHERE id = ?"
        ).bind(id),
      ]);

      return json({ ok: true });
    }

    const commentsMatch =
      path.match(/^\/api\/posts\/(\d+)\/comments$/);

    // Anyone can comment.
    if (commentsMatch && request.method === "POST") {
      const postId = Number(commentsMatch[1]);
      const data = await request.json();
      const author = cleanText(data.author, 40) || "Anonymous";
      const body = cleanText(data.body, 2000);

      if (!body) {
        return json({ error: "Comment is required." }, 400);
      }

      const post = await env.DB.prepare(
        "SELECT id FROM memo_posts WHERE id = ?"
      ).bind(postId).first();

      if (!post) {
        return json({ error: "Post not found." }, 404);
      }

      const result = await env.DB.prepare(`
        INSERT INTO memo_comments (post_id, author, body)
        VALUES (?, ?, ?)
      `).bind(postId, author, body).run();

      return json({ id: result.meta.last_row_id }, 201);
    }

    // Only the administrator can delete comments.
    const commentMatch = path.match(/^\/api\/comments\/(\d+)$/);

    if (commentMatch && request.method === "DELETE") {
      if (!isAdmin(request, env)) {
        return json({ error: "Incorrect password." }, 401);
      }

      await env.DB.prepare(
        "DELETE FROM memo_comments WHERE id = ?"
      ).bind(Number(commentMatch[1])).run();

      return json({ ok: true });
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    console.error("Memo API error:", error);
    return json({ error: "Internal server error." }, 500);
  }
}

// Existing visit logging: IP addresses are not saved.
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

    let referrer = null;
    const rawReferrer = request.headers.get("referer");

    if (rawReferrer) {
      try {
        referrer = new URL(rawReferrer).hostname;
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
