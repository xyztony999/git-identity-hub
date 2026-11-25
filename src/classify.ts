export type MailSource = "github" | "gitee" | "verify" | "other" | "untrusted";

export interface AuthResult {
  authservId: string;
  dmarc: string | null;
  dkim: string | null;
  spf: string | null;
  dkimDomain: string | null;
  dmarcFrom: string | null;
  raw: string;
}

export interface ClassifyInput {
  authResultsHeaders: string[];
  headerFrom: string | null;
  envelopeFrom: string | null;
  subject: string | null;
  githubRecipient: string | null;
  githubRecipientAddress: string | null;
  listId: string | null;
  cc: string | null;
  text: string | null;
  html: string | null;
}

export interface ClassifyResult {
  source: MailSource;
  auth: AuthResult | null;
  trusted: boolean;
  platform: "github" | "gitee" | null;
  githubReason: string | null;
}

const GITEE_DOMAINS = [
  "gitee.com",
  "git.oschina.net",
  "gitmail.oschina.net",
  "mailer.oschina.net",
];

const VERIFY_RE =
  /\b(verify|verification|confirm|confirmation|activate|activation|validate)\b|验证|激活|确认邮箱|邮箱验证/i;

export function parseCloudflareAuth(headers: string[]): AuthResult | null {
  for (const raw of headers) {
    const value = raw.trim();
    const match = value.match(/^([^;]+)(?:;|$)/);
    const authservId = (match?.[1] ?? "").trim().toLowerCase();
    if (authservId !== "mx.cloudflare.net") continue;

    const dmarc = firstToken(value, /\bdmarc=([a-z0-9-]+)/i);
    const dkim = firstToken(value, /\bdkim=([a-z0-9-]+)/i);
    const spf = firstToken(value, /\bspf=([a-z0-9-]+)/i);
    const dkimDomain = firstToken(value, /\bheader\.d=([^\s;]+)/i);
    const dmarcFrom = firstToken(value, /\bheader\.from=([^\s;]+)/i);

    return {
      authservId,
      dmarc,
      dkim,
      spf,
      dkimDomain: dkimDomain ? normalizeDomain(dkimDomain) : null,
      dmarcFrom: dmarcFrom ? normalizeDomain(dmarcFrom) : null,
      raw: value,
    };
  }
  return null;
}

export function extractEmailAddress(value: string | null): string | null {
  if (!value) return null;
  const angled = value.match(/<([^>]+)>/);
  const candidate = (angled?.[1] ?? value).trim().toLowerCase();
  if (!candidate.includes("@")) return null;
  return candidate.replace(/^mailto:/i, "");
}

export function registeredDomain(host: string | null): string | null {
  if (!host) return null;
  const parts = normalizeDomain(host).split(".").filter(Boolean);
  if (parts.length < 2) return normalizeDomain(host);
  return parts.slice(-2).join(".");
}

export function classify(input: ClassifyInput): ClassifyResult {
  const auth = parseCloudflareAuth(input.authResultsHeaders);
  const trusted = isTrusted(auth);
  const headerFrom = extractEmailAddress(input.headerFrom);
  const envelopeFrom = extractEmailAddress(input.envelopeFrom);
  const headerDomain = domainOf(headerFrom);
  const envelopeDomain = domainOf(envelopeFrom);
  const dkimDomain = auth?.dkimDomain ?? null;

  const githubReason = githubReasonFromCc(input.cc);
  const githubSignals = hasGitHubSignals(input, headerDomain, dkimDomain, envelopeDomain);
  const giteeSignals = hasGiteeSignals(headerDomain, dkimDomain, envelopeDomain);
  const looksVerify = looksLikeVerification(input);

  if (!trusted) {
    return { source: "untrusted", auth, trusted: false, platform: null, githubReason };
  }

  if ((githubSignals || giteeSignals) && looksVerify) {
    return {
      source: "verify",
      auth,
      trusted: true,
      platform: githubSignals ? "github" : "gitee",
      githubReason,
    };
  }

  if (githubSignals) {
    return { source: "github", auth, trusted: true, platform: "github", githubReason };
  }

  if (giteeSignals) {
    return { source: "gitee", auth, trusted: true, platform: "gitee", githubReason };
  }

  return { source: "other", auth, trusted: true, platform: null, githubReason };
}

function isTrusted(auth: AuthResult | null): boolean {
  if (!auth) return false;
  return auth.dmarc === "pass" || auth.dkim === "pass";
}

function hasGitHubSignals(
  input: ClassifyInput,
  headerDomain: string | null,
  dkimDomain: string | null,
  envelopeDomain: string | null,
): boolean {
  if (input.githubRecipient || input.githubRecipientAddress) return true;
  if (input.listId && /\.github\.com>/i.test(input.listId)) return true;
  if (input.cc && /@noreply\.github\.com\b/i.test(input.cc)) return true;
  return isGitHubDomain(headerDomain) || isGitHubDomain(dkimDomain) || isGitHubDomain(envelopeDomain);
}

function hasGiteeSignals(
  headerDomain: string | null,
  dkimDomain: string | null,
  envelopeDomain: string | null,
): boolean {
  if (isGiteeDomain(headerDomain) || isGiteeDomain(dkimDomain)) return true;
  if (isGiteeDomain(envelopeDomain)) return true;
  // SendCloud envelope is common for Gitee; only count it when header/DKIM already matched.
  return false;
}

function looksLikeVerification(input: ClassifyInput): boolean {
  const blob = [input.subject, input.text, stripTags(input.html)].filter(Boolean).join("\n");
  return VERIFY_RE.test(blob);
}

export function githubReasonFromCc(cc: string | null): string | null {
  if (!cc) return null;
  const match = cc.match(/([a-z0-9_]+)@noreply\.github\.com/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function isGitHubDomain(domain: string | null): boolean {
  if (!domain) return false;
  return domain === "github.com" || domain.endsWith(".github.com");
}

function isGiteeDomain(domain: string | null): boolean {
  if (!domain) return false;
  return GITEE_DOMAINS.some((item) => domain === item || domain.endsWith(`.${item}`));
}

function domainOf(address: string | null): string | null {
  if (!address) return null;
  const at = address.lastIndexOf("@");
  if (at < 0) return null;
  return normalizeDomain(address.slice(at + 1));
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}

function firstToken(value: string, re: RegExp): string | null {
  const match = value.match(re);
  return match?.[1]?.toLowerCase() ?? null;
}

function stripTags(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ");
}
