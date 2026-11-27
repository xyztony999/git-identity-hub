import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classify } from "../src/classify.ts";
import {
  classifyInputFromHeaders,
  headerBag,
  splitAuthenticationResults,
} from "../src/headers.ts";

const CF_AR =
  "mx.cloudflare.net; dkim=pass header.d=github.com header.s=pf2023; spf=pass smtp.mailfrom=sgmail.github.com; dmarc=pass header.from=github.com";
const FORGED_AR = "mail.attacker.example; dkim=pass header.d=github.com; dmarc=pass header.from=github.com";

function workersLikeHeaders(pairs: Array<[string, string]>): Headers {
  const headers = new Headers();
  for (const [name, value] of pairs) {
    headers.append(name, value);
  }
  Object.defineProperty(headers, "getAll", {
    configurable: true,
    value(name: string) {
      if (String(name).toLowerCase() !== "set-cookie") {
        throw new TypeError('getAll() can only be used with the header name "Set-Cookie".');
      }
      return headers.getSetCookie();
    },
  });
  return headers;
}

describe("splitAuthenticationResults", () => {
  it("keeps a single Cloudflare AR header intact", () => {
    assert.deepEqual(splitAuthenticationResults(CF_AR), [CF_AR]);
  });

  it("splits Fetch-combined repeated AR values", () => {
    const combined = `${FORGED_AR}, ${CF_AR}`;
    assert.deepEqual(splitAuthenticationResults(combined), [FORGED_AR, CF_AR]);
  });
});

describe("headerBag", () => {
  it("does not call getAll for Authentication-Results", () => {
    const headers = workersLikeHeaders([
      ["authentication-results", FORGED_AR],
      ["authentication-results", CF_AR],
    ]);
    const bag = headerBag(headers);
    assert.doesNotThrow(() => bag.all("authentication-results"));
    assert.deepEqual(bag.all("authentication-results"), [FORGED_AR, CF_AR]);
  });

  it("reads a single header with get", () => {
    const headers = workersLikeHeaders([["x-github-recipient-address", "git@example.com"]]);
    assert.equal(headerBag(headers).get("x-github-recipient-address"), "git@example.com");
  });

  it("uses getSetCookie for Set-Cookie and not getAll on other names", () => {
    const headers = workersLikeHeaders([
      ["set-cookie", "a=1"],
      ["set-cookie", "b=2"],
    ]);
    const bag = headerBag(headers);
    assert.doesNotThrow(() => bag.all("set-cookie"));
    assert.deepEqual(bag.all("Set-Cookie"), ["a=1", "b=2"]);
  });
});

describe("GitHub notification header path", () => {
  it("classifies sgmail envelope GitHub mail without getAll", () => {
    const headers = workersLikeHeaders([
      ["authentication-results", CF_AR],
      ["authentication-results", "sgmail.github.com; dkim=pass header.d=github.com"],
      ["from", "GitHub <notifications@github.com>"],
      ["subject", "[example/repo] Issue opened"],
      ["message-id", "<example/repo/issue/1@github.com>"],
      ["x-github-recipient", "git"],
      ["x-github-recipient-address", "git@example.com"],
      ["list-id", "example/repo <repo.example.github.com>"],
      ["cc", "subscribed@noreply.github.com"],
    ]);

    const input = classifyInputFromHeaders(
      headers,
      "bounces+848413-d73d-git=example.com@sgmail.github.com",
      {
        fromAddress: "notifications@github.com",
        subject: "[example/repo] Issue opened",
        text: "A comment was added",
        html: null,
      },
    );

    assert.deepEqual(input.authResultsHeaders, [
      CF_AR,
      "sgmail.github.com; dkim=pass header.d=github.com",
    ]);
    assert.equal(input.githubRecipientAddress, "git@example.com");
    assert.equal(input.listId, "example/repo <repo.example.github.com>");

    const result = classify(input);
    assert.equal(result.source, "github");
    assert.equal(result.trusted, true);
    assert.equal(result.auth?.authservId, "mx.cloudflare.net");
    assert.equal(result.githubReason, "subscribed");
  });

  it("still trusts Cloudflare AR when a forged AR is joined first", () => {
    const headers = workersLikeHeaders([
      ["authentication-results", FORGED_AR],
      ["authentication-results", CF_AR],
      ["from", "GitHub <notifications@github.com>"],
      ["x-github-recipient-address", "git@example.com"],
    ]);
    const result = classify(
      classifyInputFromHeaders(headers, "bounces+848413-d73d-git=example.com@sgmail.github.com", {
        fromAddress: "notifications@github.com",
        subject: "[example/repo] Issue opened",
        text: "hello",
        html: null,
      }),
    );
    assert.equal(result.source, "github");
    assert.equal(result.auth?.authservId, "mx.cloudflare.net");
  });
});
