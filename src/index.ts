import PostalMime from "postal-mime";
import { classify, type MailSource } from "./classify";
import { classifyInputFromHeaders, headerBag } from "./headers";
import { extractLinks } from "./links";
import { detailPage, errorPage, faviconSvg, identityPage, inboxPage, settingsPage, type ThemeChoice } from "./ui";

const SOURCES = new Set<MailSource>(["github", "gitee", "verify", "other", "untrusted"]);

export default {
  async email(message, env): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    await ingest(message, env, raw);
  },

  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const user = request.headers.get("Cf-Access-Authenticated-User-Email");
    const identity = await getIdentity(env);
    const theme = await loadTheme(env);
    const shell = { user, identityEmail: identity.user_email, theme };

    if (request.method === "GET" && url.pathname === "/favicon.ico") {
      return new Response(faviconSvg(), {
        headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" },
      });
    }

    if (url.pathname === "/settings" && request.method === "POST") {
      return saveSettings(request, env, shell);
    }

    if (request.method === "GET" && url.pathname === "/settings") {
      const forwardTo = await env.CONFIG.get("forward_verify_to");
      const saved = url.searchParams.get("saved");
      const notice =
        saved === "theme"
          ? "外观已保存。"
          : saved === "forward"
            ? forwardTo
              ? "验证信会转到这个地址。"
              : "已停止转发验证信。"
            : null;
      return html(settingsPage({ ...shell, forwardTo, notice, error: null }));
    }

    if (request.method === "GET" && url.pathname === "/") {
      const sourceParam = url.searchParams.get("source");
      const source = sourceParam && SOURCES.has(sourceParam as MailSource) ? (sourceParam as MailSource) : null;
      const rows = await listMessages(env, source);
      return html(
        inboxPage({
          ...shell,
          rows,
          source,
        }),
      );
    }

    if (request.method === "GET" && url.pathname === "/identity") {
      return html(identityPage({ ...shell, identity }));
    }

    const mailMatch = url.pathname.match(/^\/m\/([^/]+)(?:\/(raw))?$/);
    if (mailMatch && request.method === "GET") {
      const id = decodeURIComponent(mailMatch[1]);
      const msg = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first<StoredMessage>();
      if (!msg) {
        return html(
          errorPage({
            ...shell,
            title: "没有这封信",
            message: "账册里找不到这封信。回到列表看最近的记录。",
            next: { href: "/", label: "回账册" },
          }),
          404,
        );
      }
      if (mailMatch[2] === "raw") {
        if (!msg.r2_key) {
          return html(
            errorPage({
              ...shell,
              title: "没有原始邮件",
              message: "这封信没有保存 eml。可以回账册，或打开摘要。",
              next: { href: `/m/${encodeURIComponent(id)}`, label: "打开摘要" },
            }),
            404,
          );
        }
        const raw = await env.MAIL.get(msg.r2_key, "arrayBuffer");
        if (!raw) {
          return html(
            errorPage({
              ...shell,
              title: "原始邮件缺失",
              message: "记录还在，文件不在。回账册继续看其它信。",
              next: { href: "/", label: "回账册" },
            }),
            404,
          );
        }
        return new Response(raw, {
          headers: {
            "content-type": "message/rfc822",
            "content-disposition": `attachment; filename="${id}.eml"`,
          },
        });
      }
      await env.DB.prepare("UPDATE messages SET read = 1 WHERE id = ?").bind(id).run();
      return html(detailPage({ ...shell, msg: { ...msg, read: 1 } }));
    }

    return html(
      errorPage({
        ...shell,
        title: "没有这个页面",
        message: "地址不对。回到账册继续看信。",
        next: { href: "/", label: "回账册" },
      }),
      404,
    );
  },
} satisfies ExportedHandler<Env>;

async function ingest(message: ForwardableEmailMessage, env: Env, raw: ArrayBuffer): Promise<void> {
  const parsed = await PostalMime.parse(raw);
  const headers = headerBag(message.headers);
  const result = classify(
    classifyInputFromHeaders(message.headers, message.from, {
      fromAddress: parsed.from?.address ?? null,
      subject: parsed.subject ?? null,
      text: parsed.text ?? null,
      html: parsed.html ?? null,
    }),
  );

  const messageId = headers.get("message-id") || parsed.messageId || null;
  if (messageId) {
    const existing = await env.DB.prepare(
      "SELECT id FROM messages WHERE message_id = ? AND rcpt_to = ?",
    )
      .bind(messageId, message.to)
      .first<{ id: string }>();
    if (existing) return;
  }

  const id = crypto.randomUUID();
  const received = Date.now();
  const dt = new Date(received);
  const key = `mail/${dt.getUTCFullYear()}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${id}.eml`;
  const links = extractLinks(parsed.text ?? null, parsed.html ?? null);
  const headerFrom =
    formatAddress(parsed.from?.name, parsed.from?.address) || headers.get("from");

  await env.MAIL.put(key, raw);
  try {
    await env.DB.prepare(
      `INSERT INTO messages (
        id, message_id, received_at, envelope_from, header_from, rcpt_to, source,
        auth_dmarc, auth_dkim, subject, r2_key, size_bytes, github_reason,
        text_preview, html, links, read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
      .bind(
        id,
        messageId,
        received,
        message.from,
        headerFrom,
        message.to,
        result.source,
        result.auth?.dmarc ?? null,
        result.auth?.dkim ?? null,
        parsed.subject ?? headers.get("subject") ?? null,
        key,
        message.rawSize,
        result.githubReason,
        clip(parsed.text ?? null, 8000),
        clip(parsed.html ?? null, 100000),
        JSON.stringify(links),
      )
      .run();
  } catch (err) {
    const text = String(err);
    if (!/UNIQUE/i.test(text)) throw err;
  }

  if (result.source === "verify") {
    const dest = await env.CONFIG.get("forward_verify_to");
    if (dest && dest.includes("@")) {
      try {
        await message.forward(dest, new Headers({ "X-Git-Inbox-Id": id }));
      } catch (err) {
        console.log(JSON.stringify({ msg: "forward_failed", dest, err: String(err) }));
      }
    }
  }

  console.log(
    JSON.stringify({
      msg: "ingested",
      id,
      source: result.source,
      from: message.from,
      to: message.to,
      subject: parsed.subject ?? null,
    }),
  );
}

async function listMessages(env: Env, source: MailSource | null): Promise<StoredMessage[]> {
  const sql = source
    ? "SELECT * FROM messages WHERE source = ? ORDER BY received_at DESC LIMIT 100"
    : "SELECT * FROM messages ORDER BY received_at DESC LIMIT 100";
  const stmt = source ? env.DB.prepare(sql).bind(source) : env.DB.prepare(sql);
  const { results } = await stmt.all<StoredMessage>();
  return results ?? [];
}

async function loadTheme(env: Env): Promise<ThemeChoice> {
  const raw = await env.CONFIG.get("ui_theme");
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

async function saveSettings(
  request: Request,
  env: Env,
  shell: { user: string | null; identityEmail: string; theme: ThemeChoice },
): Promise<Response> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const forwardTo = await env.CONFIG.get("forward_verify_to");
  if (intent === "theme") {
    const next = String(form.get("theme") ?? "");
    if (next !== "light" && next !== "dark" && next !== "system") {
      return html(
        settingsPage({
          ...shell,
          forwardTo,
          notice: null,
          error: "没有这个外观选项。重选后再保存。",
        }),
        400,
      );
    }
    await env.CONFIG.put("ui_theme", next);
    return redirect("/settings?saved=theme");
  }
  if (intent === "forward") {
    const dest = String(form.get("forward_to") ?? "").trim();
    if (dest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
      return html(
        settingsPage({
          ...shell,
          forwardTo: dest,
          notice: null,
          error: "地址格式不对。写成 name@example.com 再保存。",
        }),
        400,
      );
    }
    if (dest && dest.toLowerCase() === shell.identityEmail.toLowerCase()) {
      return html(
        settingsPage({
          ...shell,
          forwardTo: dest,
          notice: null,
          error: "不能转到这本账册自己的公开邮箱。",
        }),
        400,
      );
    }
    if (dest) await env.CONFIG.put("forward_verify_to", dest);
    else await env.CONFIG.delete("forward_verify_to");
    return redirect("/settings?saved=forward");
  }
  return html(
    settingsPage({
      ...shell,
      forwardTo,
      notice: null,
      error: "没有这项设置。回到设置页再保存。",
    }),
    400,
  );
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

async function getIdentity(env: Env): Promise<IdentityRow> {
  const row = await env.DB.prepare("SELECT * FROM identity WHERE id = 1").first<IdentityRow>();
  return (
    row ?? {
      id: 1,
      user_name: env.IDENTITY_NAME || "Git User",
      user_email: env.PUBLIC_MAILBOX || "git@example.com",
      gpg_fingerprint: null,
      github_verified: 0,
      gitee_verified: 0,
    }
  );
}

function formatAddress(name: string | undefined, address: string | undefined): string | null {
  if (!address) return null;
  return name ? `${name} <${address}>` : address;
}

function clip(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
