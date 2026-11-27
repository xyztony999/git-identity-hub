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
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23c23b22'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-size='18' fill='%23f3ead8'%3E收%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Instrument+Serif:ital@0;1&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap" rel="stylesheet">
  <style>${css()}</style>
</head>
<body>
  <div class="fiber" aria-hidden="true"></div>
  <div class="desk">
    ${stamp(opts)}
    ${opts.body}
  </div>
</body>
</html>`;
}

function stamp(opts: { user: string | null; identityEmail: string; active?: string }): string {
  const who = opts.user ? `<p class="who">${escapeHtml(opts.user)}</p>` : "";
  return `<aside class="stamp">
    <div class="chop" aria-hidden="true">收</div>
    <p class="addr">${escapeHtml(opts.identityEmail)}</p>
    <nav aria-label="账册">
      <a href="/" class="${opts.active === "inbox" ? "on" : ""}">账册</a>
      <a href="/identity" class="${opts.active === "identity" ? "on" : ""}">身份</a>
    </nav>
    ${who}
  </aside>`;
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
      ? emptyState(opts.source, opts.identityEmail)
      : `<ol class="ledger">${opts.rows.map((row, i) => rowItem(row, i)).join("")}</ol>`;

  return layout({
    title: opts.source ? `${label(opts.source)} · 来信账册` : "来信账册",
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    body: `<main class="folio">
      <header class="folio-head">
        <p class="kicker">私人账册</p>
        <h1>来信</h1>
      </header>
      <nav class="filters" aria-label="分类">${filters}</nav>
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
          <h2>信里的链接</h2>
          <ul>${links
            .map(
              (l) =>
                `<li><a href="${escapeAttr(l.href)}" rel="noopener noreferrer" target="_blank">${escapeHtml(l.href)}</a></li>`,
            )
            .join("")}</ul>
        </section>`;

  const htmlFrame = opts.msg.html
    ? `<iframe class="mailview" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" srcdoc="${escapeAttr(framedHtml(opts.msg.html))}" title="信件正文"></iframe>`
    : opts.msg.text_preview
      ? `<pre class="plaintext">${escapeHtml(opts.msg.text_preview)}</pre>`
      : `<p class="empty">这封信没有可读正文。下载原始邮件查看。</p>`;

  return layout({
    title: opts.msg.subject || "无主题",
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    body: `<main class="folio open">
      <p class="close"><a href="/">合上这封信，回账册</a></p>
      <div class="stack">
        <article class="letter">
          <p class="mark ${opts.msg.source}">${label(opts.msg.source)}</p>
          <h1>${escapeHtml(opts.msg.subject || "无主题")}</h1>
          <dl class="meta">
            <div><dt>时间</dt><dd><time>${fmtTime(opts.msg.received_at)}</time></dd></div>
            <div><dt>头 From</dt><dd>${escapeHtml(opts.msg.header_from || "无")}</dd></div>
            <div><dt>信封</dt><dd>${escapeHtml(opts.msg.envelope_from || "无")}</dd></div>
            <div><dt>收件</dt><dd>${escapeHtml(opts.msg.rcpt_to || "无")}</dd></div>
            <div><dt>DMARC</dt><dd>${escapeHtml(opts.msg.auth_dmarc || "无记录")}</dd></div>
            <div><dt>DKIM</dt><dd>${escapeHtml(opts.msg.auth_dkim || "无记录")}</dd></div>
            ${opts.msg.github_reason ? `<div><dt>订阅</dt><dd>${escapeHtml(opts.msg.github_reason)}</dd></div>` : ""}
          </dl>
          ${verifyBlock}
          <div class="bodywrap">${htmlFrame}</div>
          <p class="raw"><a href="/m/${encodeURIComponent(opts.msg.id)}/raw">下载原始邮件</a></p>
        </article>
      </div>
    </main>`,
  });
}

export function identityPage(opts: {
  identity: IdentityRow;
  user: string | null;
}): string {
  return layout({
    title: "身份",
    user: opts.user,
    identityEmail: opts.identity.user_email,
    active: "identity",
    body: `<main class="folio">
      <header class="folio-head">
        <p class="kicker">名帖</p>
        <h1>提交用这一套</h1>
      </header>
      <div class="stack">
        <article class="letter">
          <p class="mark other">本机持有</p>
          <pre class="cmd">git config --global user.name  "${escapeHtml(opts.identity.user_name)}"
git config --global user.email "${escapeHtml(opts.identity.user_email)}"</pre>
          <dl class="meta">
            <div><dt>显示名</dt><dd>${escapeHtml(opts.identity.user_name)}</dd></div>
            <div><dt>公开邮箱</dt><dd>${escapeHtml(opts.identity.user_email)}</dd></div>
            <div><dt>GPG 指纹</dt><dd>${escapeHtml(opts.identity.gpg_fingerprint || "未写入，私钥留在本机")}</dd></div>
            <div><dt>GitHub</dt><dd>${opts.identity.github_verified ? "已记下验证" : "还没有验证信"}</dd></div>
            <div><dt>Gitee</dt><dd>${opts.identity.gitee_verified ? "已记下验证" : "还没有验证信"}</dd></div>
          </dl>
          <p class="note">密钥和登录凭据不放进这个账册。验证信打开后，点信里的链接完成确认。</p>
        </article>
      </div>
    </main>`,
  });
}

export function errorPage(opts: {
  user: string | null;
  identityEmail: string;
  title: string;
  message: string;
  next: { href: string; label: string };
}): string {
  return layout({
    title: opts.title,
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    body: `<main class="folio">
      <header class="folio-head">
        <p class="kicker">中断</p>
        <h1>${escapeHtml(opts.title)}</h1>
      </header>
      <div class="empty-sheet">
        <p>${escapeHtml(opts.message)}</p>
        <p class="next"><a href="${escapeAttr(opts.next.href)}">${escapeHtml(opts.next.label)}</a></p>
      </div>
    </main>`,
  });
}

function emptyState(source: string | null, identityEmail: string): string {
  if (source) {
    return `<div class="empty-sheet">
      <p>没有「${escapeHtml(label(source))}」类记录。</p>
      <p>看<a href="/">全部</a>，或等下一封信。</p>
    </div>`;
  }
  return `<div class="empty-sheet">
    <p>账册还是空的。</p>
    <p>把 GitHub 和 Gitee 的公开邮箱设成 <code>${escapeHtml(identityEmail)}</code>。验证信和通知会记在横线上。</p>
  </div>`;
}

function rowItem(row: StoredMessage, index: number): string {
  return `<li style="--i:${index}">
    <a href="/m/${encodeURIComponent(row.id)}">
      <span class="mark ${row.source}">${label(row.source)}</span>
      <span class="subj ${row.read ? "read" : ""}">${escapeHtml(row.subject || "无主题")}</span>
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
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:16px/1.55 "Literata",Palatino,serif;color:#1c1712;background:#f7efe0;margin:1rem 1.1rem;}a{color:#c23b22;}img{max-width:100%;}</style></head><body>${html}</body></html>`;
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
:root{
  --paper:#f3ead8;
  --paper-sheet:#f7efe0;
  --paper-deep:#e6d8c0;
  --ink:#1c1712;
  --ink-soft:#5e554a;
  --rule:#d3c4ab;
  --seal:#c23b22;
  --seal-deep:#9e2e1b;
  --font-display:"Instrument Serif", "Iowan Old Style", Palatino, serif;
  --font-body:"Literata", Palatino, serif;
  --font-mono:"Fragment Mono", "Courier New", Courier, monospace;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:var(--font-body);font-optical-sizing:auto}
a{color:inherit}
.fiber{pointer-events:none;position:fixed;inset:0;opacity:.18;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")}
.desk{display:grid;grid-template-columns:14rem minmax(0,1fr);min-height:100vh;position:relative;overflow-x:clip}
.stamp{padding:2.4rem 1.4rem 2rem;border-right:1px solid var(--ink);display:flex;flex-direction:column;gap:1.4rem;position:sticky;top:0;height:100vh}
.chop{width:4.6rem;height:4.6rem;background:var(--seal);color:var(--paper);font-family:var(--font-display);font-size:2.5rem;line-height:4.6rem;text-align:center;box-shadow:2px 2px 0 var(--seal-deep);letter-spacing:.05em}
.addr{font-family:var(--font-mono);font-size:.78rem;line-height:1.55;writing-mode:vertical-rl;letter-spacing:.08em;margin:0;color:var(--ink);align-self:flex-start;min-height:12rem;overflow-wrap:anywhere}
.stamp nav{display:flex;flex-direction:column;gap:.45rem;font-family:var(--font-display);font-size:1.25rem}
.stamp nav a{text-decoration:none;border-bottom:1px solid transparent;width:max-content;padding-bottom:.1rem}
.stamp nav a.on,.stamp nav a:hover{border-bottom-color:var(--seal);color:var(--seal)}
.who{margin-top:auto;font-family:var(--font-mono);font-size:.68rem;color:var(--ink-soft);word-break:break-all}
.folio{padding:2.2rem 4vw 4rem;min-width:0;overflow-x:clip;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 31px,var(--rule) 32px);background-attachment:local}
.folio-head{margin-bottom:1.2rem;animation:enter .55s ease both}
.kicker{margin:0;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--seal)}
h1{font-family:var(--font-display);font-weight:400;font-size:clamp(2.2rem,5vw,3.4rem);margin:.15rem 0 0;line-height:1.1}
.filters{display:flex;flex-wrap:wrap;gap:.35rem 1.1rem;margin:0 0 1.1rem;font-family:var(--font-mono);font-size:.78rem;animation:enter .55s ease both;animation-delay:.05s}
.filters a{text-decoration:none;border-bottom:1px solid transparent;padding-bottom:.12rem;color:var(--ink-soft)}
.filters a.on,.filters a:hover{color:var(--ink);border-bottom-color:var(--seal)}
.ledger{list-style:none;margin:0;padding:0}
.ledger li{animation:enter .5s ease both;animation-delay:calc(var(--i,0) * 45ms + .08s)}
.ledger a{display:grid;grid-template-columns:6.2rem minmax(0,1fr) minmax(8rem,16rem) 10.5rem;gap:.8rem 1rem;align-items:baseline;padding:.55rem 0 .5rem;text-decoration:none;border-bottom:1px solid var(--rule);transition:border-bottom-color .16s ease,border-bottom-width .16s ease}
.ledger a:hover,.ledger a:focus-visible{border-bottom-color:var(--seal);border-bottom-width:2px;outline:none}
.subj{font-size:1.12rem}
.subj.read{color:var(--ink-soft)}
.from,time,.meta dd,.href,.links a{font-family:var(--font-mono);font-size:.75rem;color:var(--ink-soft);overflow-wrap:anywhere}
.mark{display:inline-block;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;padding:.12rem .4rem;border:1px solid var(--rule);color:var(--ink-soft);width:max-content}
.mark.verify,.mark.untrusted{color:var(--seal);border-color:var(--seal)}
.empty-sheet{max-width:36rem;padding:1.4rem 0 2rem;animation:enter .55s ease both;animation-delay:.12s}
.empty-sheet p{margin:.4rem 0;font-size:1.15rem;line-height:1.6}
.empty-sheet code,.href{font-family:var(--font-mono);font-size:.85em}
.empty,.note{color:var(--ink-soft);max-width:40rem;line-height:1.6}
.next a,.close a,.raw a{color:var(--seal);font-family:var(--font-mono);font-size:.85rem}
.close{margin:0 0 1.2rem;animation:enter .4s ease both}
.stack{position:relative;max-width:min(46rem,100%);animation:enter .55s ease both;animation-delay:.08s}
.stack::before,.stack::after{content:"";position:absolute;inset:0;background:var(--paper-deep);border:1px solid var(--rule);pointer-events:none}
.stack::before{transform:rotate(-1.15deg) translate(8px,10px)}
.stack::after{transform:rotate(.7deg) translate(-5px,4px)}
.letter{position:relative;z-index:1;background:var(--paper-sheet);color:var(--ink);padding:2rem 1.8rem 2.2rem;border:1px solid var(--ink)}
.letter h1{font-size:clamp(1.8rem,3.5vw,2.5rem);margin:.35rem 0 1.1rem}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr));gap:.65rem 1.1rem;margin:0 0 1.2rem}
.meta dt{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;color:var(--ink-soft)}
.meta dd{margin:.2rem 0 0;color:var(--ink);word-break:break-all}
.links{margin:0 0 1.2rem}
.links h2{font-family:var(--font-display);font-weight:400;font-size:1.35rem;margin:0 0 .5rem}
.links ul{padding-left:1.1rem;margin:0}
.links a{overflow-wrap:anywhere;word-break:normal;color:var(--seal);font-size:.82rem}
.bodywrap{margin-top:.4rem;border-top:1px solid var(--rule);padding-top:1rem}
.mailview{width:100%;min-height:26rem;border:0;background:var(--paper-sheet)}
.plaintext,.cmd{white-space:pre-wrap;font-family:var(--font-mono);font-size:.86rem;background:transparent;color:var(--ink);padding:.2rem 0 1rem;margin:0;border-bottom:1px solid var(--rule);overflow:auto}
.raw{margin:1.2rem 0 0}
@media (max-width:900px){
  .desk{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);align-content:start}
  .stamp{height:auto;position:relative;display:grid;grid-template-columns:4.6rem 1fr;grid-template-rows:auto auto;gap:.7rem 1rem;align-items:center;border-right:0;border-bottom:1px solid var(--ink);padding:1.1rem 5vw 1.2rem}
  .chop{grid-row:1 / span 2}
  .addr{writing-mode:horizontal-tb;min-height:0;letter-spacing:0;align-self:center}
  .stamp nav{flex-direction:row;flex-wrap:wrap;gap:.2rem 1rem;grid-column:2}
  .who{margin-top:0;grid-column:1 / -1}
  .ledger a{grid-template-columns:1fr;gap:.2rem}
  .stack::before,.stack::after{transform:none;inset:8px -6px -8px 8px}
  .letter{padding:1.4rem 1.05rem 1.6rem}
}
@media (prefers-reduced-motion:reduce){
  .folio-head,.filters,.ledger li,.empty-sheet,.close,.stack{animation:none}
}
@keyframes enter{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}
}
`;
}
