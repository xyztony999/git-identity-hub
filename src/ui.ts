import type { MailSource } from "./classify";
import { rankLinks } from "./links";

const SOURCES: MailSource[] = ["github", "gitee", "verify", "other", "untrusted"];

export function layout(opts: {
  title: string;
  user: string | null;
  identityEmail: string;
  active?: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(opts.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${css()}</style>
</head>
<body>
  <div class="grain"></div>
  <header class="mast">
    <div>
      <p class="eyebrow">git desk</p>
      <h1><a href="/">Git 收件箱</a></h1>
      <p class="lede">${escapeHtml(opts.identityEmail)}</p>
    </div>
    <div class="who">
      <span>${escapeHtml(opts.user ?? "Access 会话")}</span>
      <nav>
        <a href="/" class="${opts.active === "inbox" ? "on" : ""}">信件</a>
        <a href="/identity" class="${opts.active === "identity" ? "on" : ""}">身份</a>
      </nav>
    </div>
  </header>
  ${opts.body}
</body>
</html>`;
}

export function inboxPage(opts: {
  rows: StoredMessage[];
  source: string | null;
  identityEmail: string;
  user: string | null;
}): string {
  const filters = [`<a href="/" class="${opts.source ? "" : "on"}">全部</a>`]
    .concat(
      SOURCES.map(
        (s) =>
          `<a href="/?source=${s}" class="${opts.source === s ? "on" : ""}">${label(s)}</a>`,
      ),
    )
    .join("");

  const items =
    opts.rows.length === 0
      ? `<p class="empty">还没有信。把 GitHub / Gitee 的公开邮箱设成 <code>${escapeHtml(opts.identityEmail)}</code>，验证信会落在这里。</p>`
      : `<ul class="ledger">${opts.rows.map(rowItem).join("")}</ul>`;

  return layout({
    title: "Git 收件箱",
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    body: `<main>
      <div class="filters">${filters}</div>
      ${items}
    </main>`,
  });
}

export function detailPage(opts: {
  msg: StoredMessage;
  user: string | null;
  identityEmail: string;
}): string {
  const links = rankLinks(safeJsonLinks(opts.msg.links));
  const verifyBlock =
    links.length === 0
      ? ""
      : `<section class="links">
          <h2>可打开的链接</h2>
          <ul>${links
            .map(
              (l) =>
                `<li><a class="${l.verify ? "verify" : ""}" href="${escapeAttr(l.href)}" rel="noopener noreferrer" target="_blank">${escapeHtml(l.href)}</a></li>`,
            )
            .join("")}</ul>
        </section>`;

  const htmlFrame = opts.msg.html
    ? `<iframe class="mailview" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" srcdoc="${escapeAttr(framedHtml(opts.msg.html))}"></iframe>`
    : opts.msg.text_preview
      ? `<pre class="plaintext">${escapeHtml(opts.msg.text_preview)}</pre>`
      : `<p class="empty">没有可读正文。可下载原始 eml。</p>`;

  return layout({
    title: opts.msg.subject || "(无主题)",
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    body: `<main class="detail">
      <p class="back"><a href="/">← 收件箱</a></p>
      <article class="letter">
        <p class="chip ${opts.msg.source}">${label(opts.msg.source)}</p>
        <h2>${escapeHtml(opts.msg.subject || "(无主题)")}</h2>
        <dl class="meta">
          <div><dt>时间</dt><dd>${fmtTime(opts.msg.received_at)}</dd></div>
          <div><dt>头 From</dt><dd>${escapeHtml(opts.msg.header_from || "—")}</dd></div>
          <div><dt>信封</dt><dd>${escapeHtml(opts.msg.envelope_from || "—")}</dd></div>
          <div><dt>收件</dt><dd>${escapeHtml(opts.msg.rcpt_to || "—")}</dd></div>
          <div><dt>DMARC</dt><dd>${escapeHtml(opts.msg.auth_dmarc || "—")}</dd></div>
          <div><dt>DKIM</dt><dd>${escapeHtml(opts.msg.auth_dkim || "—")}</dd></div>
          ${opts.msg.github_reason ? `<div><dt>GitHub reason</dt><dd>${escapeHtml(opts.msg.github_reason)}</dd></div>` : ""}
        </dl>
        ${verifyBlock}
        <div class="bodywrap">${htmlFrame}</div>
        <p class="raw"><a href="/m/${encodeURIComponent(opts.msg.id)}/raw">下载 .eml</a></p>
      </article>
    </main>`,
  });
}

export function identityPage(opts: {
  identity: IdentityRow;
  user: string | null;
}): string {
  return layout({
    title: "Git 身份",
    user: opts.user,
    identityEmail: opts.identity.user_email,
    active: "identity",
    body: `<main>
      <article class="letter">
        <p class="chip other">本机身份，不在 Worker 里</p>
        <h2>提交与 GPG 用这一套</h2>
        <pre class="cmd">git config --global user.name  "${escapeHtml(opts.identity.user_name)}"
git config --global user.email "${escapeHtml(opts.identity.user_email)}"</pre>
        <dl class="meta">
          <div><dt>显示名</dt><dd>${escapeHtml(opts.identity.user_name)}</dd></div>
          <div><dt>公开邮箱</dt><dd>${escapeHtml(opts.identity.user_email)}</dd></div>
          <div><dt>GPG 指纹</dt><dd>${escapeHtml(opts.identity.gpg_fingerprint || "未写入（私钥留在本机）")}</dd></div>
          <div><dt>GitHub 验证</dt><dd>${opts.identity.github_verified ? "已标记" : "等验证信"}</dd></div>
          <div><dt>Gitee 验证</dt><dd>${opts.identity.gitee_verified ? "已标记" : "等验证信"}</dd></div>
        </dl>
        <p class="note">GPG 私钥、git credential、SSH 都不进这个 Worker。平台验证信点详情页里的链接即可。</p>
      </article>
    </main>`,
  });
}

function rowItem(row: StoredMessage): string {
  return `<li>
    <a href="/m/${encodeURIComponent(row.id)}">
      <span class="chip ${row.source}">${label(row.source)}</span>
      <span class="subj ${row.read ? "read" : ""}">${escapeHtml(row.subject || "(无主题)")}</span>
      <span class="from">${escapeHtml(row.header_from || row.envelope_from || "")}</span>
      <time>${fmtTime(row.received_at)}</time>
    </a>
  </li>`;
}

function label(source: MailSource | string): string {
  switch (source) {
    case "github":
      return "GitHub";
    case "gitee":
      return "Gitee";
    case "verify":
      return "验证";
    case "other":
      return "其它";
    case "untrusted":
      return "未认证";
    default:
      return source;
  }
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

function safeJsonLinks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function framedHtml(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:16px/1.5 Georgia,serif;color:#1c1916;background:#f7f1e6;margin:1rem;}a{color:#8a3b12;}img{max-width:100%;}</style></head><body>${html}</body></html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function css(): string {
  return `
:root{--ink:#16130f;--paper:#efe6d4;--card:#f7f1e6;--line:#cfc3ab;--copper:#c45c26;--mute:#6d6456;}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ink);color:var(--paper);font-family:"Newsreader",Georgia,serif}
a{color:inherit}
.grain{pointer-events:none;position:fixed;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")}
.mast{display:flex;justify-content:space-between;gap:2rem;padding:2.2rem 6vw 1rem;border-bottom:1px solid #2b261f}
.eyebrow{letter-spacing:.18em;text-transform:uppercase;font-family:"JetBrains Mono",monospace;font-size:.72rem;color:var(--copper);margin:0}
h1{font-family:"Fraunces",serif;font-weight:700;font-size:2.4rem;margin:.2rem 0}
h1 a{text-decoration:none}
.lede,.who span{font-family:"JetBrains Mono",monospace;font-size:.85rem;color:var(--mute)}
.who{text-align:right}
.who nav{display:flex;gap:1rem;justify-content:flex-end;margin-top:.6rem}
.who nav a,.filters a{text-decoration:none;border-bottom:1px solid transparent}
.who nav a.on,.filters a.on{border-color:var(--copper);color:var(--copper)}
main{padding:1.5rem 6vw 4rem}
.filters{display:flex;flex-wrap:wrap;gap:.8rem 1.2rem;margin-bottom:1.4rem;font-family:"JetBrains Mono",monospace;font-size:.85rem}
.ledger{list-style:none;margin:0;padding:0;border-top:1px solid #2b261f}
.ledger li a{display:grid;grid-template-columns:7rem 1fr 16rem 11rem;gap:1rem;align-items:baseline;padding:.9rem 0;border-bottom:1px solid #2b261f;text-decoration:none}
.subj{font-size:1.15rem}
.subj.read{color:var(--mute)}
.from,time{font-family:"JetBrains Mono",monospace;font-size:.78rem;color:var(--mute)}
.chip{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:.15rem .45rem;border:1px solid currentColor}
.chip.github{color:#9ec27c}.chip.gitee{color:#e08a7a}.chip.verify{color:var(--copper)}.chip.other{color:#cbb98a}.chip.untrusted{color:#8a8176}
.empty,.note{color:var(--mute);max-width:42rem}
.letter{background:var(--card);color:var(--ink);padding:1.6rem 1.6rem 2rem;border:1px solid var(--line);box-shadow:8px 10px 0 #0c0b09}
.letter h2{font-family:"Fraunces",serif;margin:.4rem 0 1rem}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.7rem 1.2rem;font-family:"JetBrains Mono",monospace;font-size:.78rem}
.meta dt{color:var(--mute)}
.meta dd{margin:.15rem 0 0}
.links{margin:1.3rem 0}
.links ul{padding-left:1.1rem}
.links a{word-break:break-all;color:#8a3b12}
.links a.verify{font-weight:600}
.bodywrap{margin-top:1rem;background:#f7f1e6;border:1px solid var(--line)}
.mailview{width:100%;min-height:28rem;border:0;background:#f7f1e6}
.plaintext,.cmd{white-space:pre-wrap;font-family:"JetBrains Mono",monospace;font-size:.86rem;background:#1c1916;color:#efe6d4;padding:1rem;overflow:auto}
.back,.raw{font-family:"JetBrains Mono",monospace;font-size:.85rem}
.raw a,.back a{color:var(--copper)}
@media (max-width:900px){
  .ledger li a{grid-template-columns:1fr;gap:.25rem}
  .mast{flex-direction:column}
  .who{text-align:left}
}
`;
}
