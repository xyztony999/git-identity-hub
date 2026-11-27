import type { ClassifyInput } from "./classify";

const SET_COOKIE = "set-cookie";

type HeadersWithLegacyGetAll = Headers & {
  getAll?: (name: string) => string[];
};

export function headerBag(headers: Headers) {
  return {
    get(name: string): string | null {
      return headers.get(name);
    },
    all(name: string): string[] {
      if (name.toLowerCase() === SET_COOKIE) {
        return setCookieValues(headers);
      }
      const single = headers.get(name);
      if (!single) return [];
      if (name.toLowerCase() === "authentication-results") {
        return splitAuthenticationResults(single);
      }
      return [single];
    },
  };
}

export function classifyInputFromHeaders(
  headers: Headers,
  envelopeFrom: string,
  parsed: {
    fromAddress?: string | null;
    subject?: string | null;
    text?: string | null;
    html?: string | null;
  },
): ClassifyInput {
  const bag = headerBag(headers);
  return {
    authResultsHeaders: bag.all("authentication-results"),
    headerFrom: parsed.fromAddress ?? bag.get("from"),
    envelopeFrom,
    subject: parsed.subject ?? bag.get("subject"),
    githubRecipient: bag.get("x-github-recipient"),
    githubRecipientAddress: bag.get("x-github-recipient-address"),
    listId: bag.get("list-id"),
    cc: bag.get("cc"),
    text: parsed.text ?? null,
    html: parsed.html ?? null,
  };
}

/** Fetch/Workers `Headers.get` joins repeated values with `, `. Undo that for AR. */
export function splitAuthenticationResults(combined: string): string[] {
  const trimmed = combined.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/,(?=\s*[A-Za-z0-9][A-Za-z0-9._-]*(?:\s+\d+(?:\.\d+)?)?\s*;)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function setCookieValues(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const getAll = (headers as HeadersWithLegacyGetAll).getAll;
  if (typeof getAll === "function") {
    return getAll.call(headers, "Set-Cookie");
  }
  const single = headers.get("Set-Cookie");
  return single ? [single] : [];
}
