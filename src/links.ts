const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

const VERIFY_HINT =
  /verify|confirm|activate|validation|invitation|oauth|login|auth|token|gitee\.com|github\.com/i;

export function extractLinks(text: string | null, html: string | null): string[] {
  const found = new Set<string>();
  collect(text, found);
  if (html) {
    for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
      addHref(match[1], found);
    }
    collect(html.replace(/<[^>]+>/g, " "), found);
  }
  return [...found];
}

export function rankLinks(links: string[]): { href: string; verify: boolean }[] {
  return links
    .map((href) => ({ href, verify: VERIFY_HINT.test(href) }))
    .sort((a, b) => Number(b.verify) - Number(a.verify));
}

function collect(value: string | null, found: Set<string>): void {
  if (!value) return;
  for (const match of value.matchAll(URL_RE)) {
    addHref(match[0], found);
  }
}

function addHref(raw: string, found: Set<string>): void {
  let href = raw.trim().replace(/[.,;:]+$/, "");
  if (href.startsWith("//")) href = `https:${href}`;
  if (!/^https?:\/\//i.test(href)) return;
  if (/^(https?:\/\/)(localhost|127\.|0\.0\.0\.0)/i.test(href)) return;
  found.add(href);
}
