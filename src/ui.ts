import type { MailSource } from "./classify";
import { rankLinks } from "./links";

const SOURCES: MailSource[] = ["github", "gitee", "verify", "other", "untrusted"];

export type ThemeChoice = "light" | "dark" | "system";

type Shell = {
  title: string;
  user: string | null;
  identityEmail: string;
  active?: "inbox" | "identity" | "settings";
  theme?: ThemeChoice;
  body: string;
};

export function layout(opts: Shell): string {
  const theme = opts.theme === "light" || opts.theme === "dark" || opts.theme === "system" ? opts.theme : "system";
  return `<!doctype html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(opts.title)}</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fragment+Mono&family=Instrument+Serif:ital@0;1&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap" rel="stylesheet">
  <style>${css()}</style>
</head>
<body>
  <div class="fiber" aria-hidden="true"></div>
  <div class="desk">
    ${bar(opts)}
    ${opts.body}
  </div>
</body>
</html>`;
}

const SEAL_COVER = "M1.5 8.2 18 3.4 34.5 8.2V24.6L18 29.4 1.5 24.6V8.2z";
const SEAL_SPINE = "M17.15 6.2h1.7v20.2h-1.7z";

export function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 32"><path fill="#c23b22" d="${SEAL_COVER}"/><path fill="#f6efe2" d="${SEAL_SPINE}"/></svg>`;
}

function logo(): string {
  return `<svg class="logo" viewBox="0 0 36 32" role="img" aria-label="账册印"><path fill="currentColor" d="${SEAL_COVER}"/><path class="impress" d="${SEAL_SPINE}"/></svg>`;
}

function bar(opts: Shell): string {
  const who = opts.user ? `<p class="who">${escapeHtml(opts.user)}</p>` : "";
  return `<header class="bar">
    <a class="lockup" href="/">${logo()}<span class="word">来信</span></a>
    <p class="addr">${escapeHtml(opts.identityEmail)}</p>
    <nav aria-label="账册">
      <a href="/" class="${opts.active === "inbox" ? "on" : ""}">账册</a>
      <a href="/identity" class="${opts.active === "identity" ? "on" : ""}">身份</a>
      <a href="/settings" class="${opts.active === "settings" ? "on" : ""}">设置</a>
    </nav>
    ${who}
  </header>`;
}

export function inboxPage(opts: {
  rows: StoredMessage[];
  source: string | null;
  identityEmail: string;
  user: string | null;
  theme?: ThemeChoice;
}): string {
  const filters = [`<a href="/" class="${opts.source ? "" : "on"}">全部</a>`]
    .concat(
      SOURCES.map(
        (s) => `<a href="/?source=${s}" class="${opts.source === s ? "on" : ""}">${label(s)}</a>`,
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
    theme: opts.theme,
    body: `<main class="folio">
      <nav class="filters" aria-label="分类">${filters}</nav>
      ${items}
    </main>`,
  });
}

export function detailPage(opts: {
  msg: StoredMessage;
  user: string | null;
  identityEmail: string;
  theme?: ThemeChoice;
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
    theme: opts.theme,
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
  theme?: ThemeChoice;
}): string {
  return layout({
    title: "身份",
    user: opts.user,
    identityEmail: opts.identity.user_email,
    active: "identity",
    theme: opts.theme,
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

export function settingsPage(opts: {
  user: string | null;
  identityEmail: string;
  theme?: ThemeChoice;
  forwardTo: string | null;
  notice: string | null;
  error: string | null;
}): string {
  const theme = opts.theme === "light" || opts.theme === "dark" || opts.theme === "system" ? opts.theme : "system";
  const notice = opts.notice ? `<p class="notice" role="status">${escapeHtml(opts.notice)}</p>` : "";
  const error = opts.error ? `<p class="form-error" role="alert">${escapeHtml(opts.error)}</p>` : "";
  const picked = (value: ThemeChoice, text: string) =>
    `<label class="choice"><input type="radio" name="theme" value="${value}"${theme === value ? " checked" : ""}> ${text}</label>`;

  return layout({
    title: "设置",
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "settings",
    theme,
    body: `<main class="folio">
      <header class="folio-head">
        <p class="kicker">配置</p>
        <h1>设置</h1>
      </header>
      ${notice}
      <section class="sheet">
        <h2>验证信转发</h2>
        <p class="note">只有分类为「验证」的信会转到这个地址。GitHub 通知和 Gitee 绑定信仍只记在账册里。地址必须是 Cloudflare Email Routing 里已经验证过的 destination。留空再保存，就停止转发。</p>
        ${error}
        <form method="post" action="/settings">
          <input type="hidden" name="intent" value="forward">
          <label class="field">转发到
            <input name="forward_to" type="email" inputmode="email" autocomplete="email" maxlength="254" value="${escapeAttr(opts.forwardTo ?? "")}" placeholder="name@example.com">
          </label>
          <button type="submit">保存转发</button>
        </form>
      </section>
      <section class="sheet">
        <h2>外观</h2>
        <p class="note">浅色是暖纸，暗色是同一本账册换到夜里。跟随系统时，用这台设备的外观。</p>
        <form method="post" action="/settings">
          <input type="hidden" name="intent" value="theme">
          <div class="choices">
            ${picked("light", "浅色纸")}
            ${picked("dark", "暗色")}
            ${picked("system", "跟随系统")}
          </div>
          <button type="submit">保存外观</button>
        </form>
      </section>
    </main>`,
  });
}

export function errorPage(opts: {
  user: string | null;
  identityEmail: string;
  title: string;
  message: string;
  next: { href: string; label: string };
  theme?: ThemeChoice;
}): string {
  return layout({
    title: opts.title,
    user: opts.user,
    identityEmail: opts.identityEmail,
    active: "inbox",
    theme: opts.theme,
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
      <span class="subj ${row.read ? "read" : ""}">${escapeHtml(row.subject || "无主题")}</span>
      <span class="byline">
        <span class="mark ${row.source}">${label(row.source)}</span>
        <span class="from">${escapeHtml(row.header_from || row.envelope_from || "")}</span>
        <time>${fmtTime(row.received_at)}</time>
      </span>
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
:root, [data-theme="light"]{
  --paper:#f3ead8;
  --paper-sheet:#f7efe0;
  --paper-deep:#e6d8c0;
  --ink:#1c1712;
  --ink-soft:#5e554a;
  --rule:#d3c4ab;
  --seal:#c23b22;
  --seal-ink:#9e2e1b;
  --on-seal:#f6efe2;
  --letter:#f7efe0;
  --letter-ink:#1c1712;
  color-scheme:light;
}
[data-theme="dark"]{
  --paper:#14110e;
  --paper-sheet:#221c17;
  --paper-deep:#2c261f;
  --ink:#f3ead8;
  --ink-soft:#c4b5a0;
  --rule:#3c342c;
  --seal:#c23b22;
  --seal-ink:#e7a090;
  --on-seal:#f6efe2;
  --letter:#f7efe0;
  --letter-ink:#1c1712;
  color-scheme:dark;
}
@media (prefers-color-scheme: dark){
  [data-theme="system"]{
    --paper:#14110e;
    --paper-sheet:#221c17;
    --paper-deep:#2c261f;
    --ink:#f3ead8;
    --ink-soft:#c4b5a0;
    --rule:#3c342c;
    --seal:#c23b22;
    --seal-ink:#e7a090;
    --on-seal:#f6efe2;
    --letter:#f7efe0;
    --letter-ink:#1c1712;
    color-scheme:dark;
  }
}
:root{
  --font-display:"Instrument Serif", "Iowan Old Style", Palatino, serif;
  --font-body:"Literata", Palatino, serif;
  --font-mono:"Fragment Mono", "Courier New", Courier, monospace;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:var(--font-body);font-optical-sizing:auto}
a{color:inherit}
.fiber{pointer-events:none;position:fixed;inset:0;opacity:.16;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")}
[data-theme="dark"] .fiber{mix-blend-mode:overlay;opacity:.28}
@media (prefers-color-scheme: dark){
  [data-theme="system"] .fiber{mix-blend-mode:overlay;opacity:.28}
}
.desk{min-height:100vh;position:relative}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem 1.15rem;padding:1rem 4vw .9rem;border-bottom:1px solid var(--ink)}
.lockup{display:flex;align-items:center;gap:.6rem;text-decoration:none}
.logo{width:2.35rem;height:2.05rem;color:var(--seal);display:block;flex:none}
.logo .impress{fill:var(--on-seal)}
.word{font-family:var(--font-display);font-size:1.85rem;line-height:1}
.addr{margin:0;font-family:var(--font-mono);font-size:.78rem;color:var(--ink);overflow-wrap:anywhere}
.bar nav{display:flex;flex-wrap:wrap;gap:.35rem 1rem;margin-left:auto;font-family:var(--font-display);font-size:1.2rem}
.bar nav a{text-decoration:none;border-bottom:1px solid transparent;padding-bottom:.08rem}
.bar nav a.on,.bar nav a:hover{color:var(--seal-ink);border-bottom-color:var(--seal)}
.who{flex-basis:100%;margin:0;font-family:var(--font-mono);font-size:.68rem;color:var(--ink-soft);overflow-wrap:anywhere}
.folio{padding:1.2rem 4vw 4rem;min-width:0}
.folio-head{margin:0 0 1.1rem;animation:enter .55s ease both}
.kicker{margin:0;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--seal-ink)}
h1{font-family:var(--font-display);font-weight:400;font-size:clamp(2rem,4vw,3rem);margin:.15rem 0 0;line-height:1.1}
h2{font-family:var(--font-display);font-weight:400;font-size:1.55rem;margin:0 0 .4rem}
.filters{display:flex;flex-wrap:wrap;gap:.4rem 1.05rem;margin:0 0 .4rem;font-family:var(--font-mono);font-size:.78rem;animation:enter .55s ease both}
.filters a{text-decoration:none;border-bottom:1px solid transparent;padding-bottom:.12rem;color:var(--ink)}
.filters a.on,.filters a:hover{color:var(--ink);border-bottom-color:var(--seal)}
.ledger{list-style:none;margin:0;padding:0}
.ledger li{animation:enter .5s ease both;animation-delay:calc(var(--i,0) * 45ms + .06s)}
.ledger a{display:block;padding:.72rem 0 .62rem;text-decoration:none;border-bottom:1px solid var(--rule);transition:border-bottom-color .16s ease,border-bottom-width .16s ease}
.ledger a:hover,.ledger a:focus-visible{border-bottom-color:var(--seal);border-bottom-width:2px;outline:none}
.subj{display:block;font-size:1.16rem;line-height:1.35}
.subj.read{color:var(--ink-soft)}
.byline{display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem .85rem;margin-top:.28rem}
.from,.byline time,.meta dd{font-family:var(--font-mono);font-size:.75rem;color:var(--ink-soft);overflow-wrap:anywhere}
.mark{display:inline-block;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:.1rem .38rem;border:1px solid var(--rule);color:var(--ink-soft)}
.mark.verify,.mark.untrusted{color:var(--seal-ink);border-color:var(--seal)}
.empty-sheet,.sheet{max-width:40rem;padding:.2rem 0 1.4rem;animation:enter .55s ease both;animation-delay:.08s}
.empty-sheet p,.note{margin:.4rem 0;line-height:1.6;color:var(--ink-soft)}
.empty-sheet p{font-size:1.12rem;color:var(--ink)}
.empty-sheet code{font-family:var(--font-mono);font-size:.85em}
.sheet{border-top:1px solid var(--rule);padding-top:1.15rem;margin-top:.4rem}
.sheet .note{max-width:38rem}
.field{display:flex;flex-direction:column;gap:.35rem;margin:.9rem 0 .8rem;max-width:26rem;font-family:var(--font-mono);font-size:.75rem;color:var(--ink-soft)}
.field input{font-family:var(--font-mono);font-size:.95rem;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--ink);padding:.4rem 0;border-radius:0}
.field input:focus{outline:none;border-bottom-color:var(--seal);border-bottom-width:2px}
.choices{display:flex;flex-wrap:wrap;gap:.45rem .9rem;margin:.7rem 0 .9rem}
.choice{display:flex;align-items:center;gap:.4rem;font-size:1.02rem}
button{font-family:var(--font-mono);font-size:.82rem;background:var(--seal);color:var(--on-seal);border:0;padding:.48rem .85rem;cursor:pointer}
button:hover{background:#9e2e1b;color:var(--on-seal)}
.notice{color:var(--seal-ink);font-family:var(--font-mono);font-size:.85rem}
.form-error{color:var(--seal-ink);margin:.6rem 0}
.next a,.close a,.raw a,.links a{color:var(--seal-ink);overflow-wrap:anywhere}
.close,.raw,.next{font-family:var(--font-mono);font-size:.85rem}
.close{margin:0 0 1.1rem;animation:enter .4s ease both}
.stack{position:relative;max-width:min(46rem,100%);animation:enter .55s ease both;animation-delay:.08s}
.stack::before,.stack::after{content:"";position:absolute;inset:0;background:var(--paper-deep);border:1px solid var(--rule);pointer-events:none}
.stack::before{transform:rotate(-1.15deg) translate(8px,10px)}
.stack::after{transform:rotate(.7deg) translate(-5px,4px)}
.letter{position:relative;z-index:1;background:var(--letter);color:var(--letter-ink);padding:2rem 1.8rem 2.2rem;border:1px solid var(--letter-ink)}
.letter h1{font-size:clamp(1.8rem,3.5vw,2.5rem);margin:.35rem 0 1.1rem}
.letter .mark{color:#5e554a;border-color:#d3c4ab}
.letter .mark.verify,.letter .mark.untrusted{color:#9e2e1b;border-color:#c23b22}
.letter .meta dd,.letter .note,.letter .from{color:#5e554a}
.letter .cmd{color:var(--letter-ink);border-bottom-color:#d3c4ab}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr));gap:.65rem 1.1rem;margin:0 0 1.2rem}
.meta dt{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;color:var(--ink-soft)}
.letter .meta dt{color:#5e554a}
.meta dd{margin:.2rem 0 0;color:var(--ink);word-break:break-all}
.links{margin:0 0 1.2rem}
.links h2{margin:0 0 .45rem}
.links ul{padding-left:1.1rem;margin:0}
.links a{font-family:var(--font-mono);font-size:.78rem}
.bodywrap{margin-top:.4rem;border-top:1px solid #d3c4ab;padding-top:1rem}
.mailview{width:100%;min-height:26rem;border:0;background:var(--letter)}
.plaintext,.cmd{white-space:pre-wrap;font-family:var(--font-mono);font-size:.86rem;background:transparent;color:inherit;padding:.2rem 0 1rem;margin:0;border-bottom:1px solid var(--rule);overflow:auto}
.raw{margin:1.2rem 0 0}
@media (max-width:720px){
  .bar nav{margin-left:0}
  .stack::before,.stack::after{transform:none;inset:8px -6px -8px 8px}
  .letter{padding:1.35rem 1rem 1.5rem}
}
@media (prefers-reduced-motion:reduce){
  .folio-head,.filters,.ledger li,.empty-sheet,.sheet,.close,.stack{animation:none}
}
@keyframes enter{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}
}
`;
}
