import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classify, parseCloudflareAuth } from "../src/classify.ts";
import { extractLinks, rankLinks } from "../src/links.ts";

const cfPass = [
  "mx.cloudflare.net; dkim=pass header.d=github.com header.s=pf2023; spf=pass smtp.mailfrom=github.com; dmarc=pass header.from=github.com",
];

describe("parseCloudflareAuth", () => {
  it("ignores forged Authentication-Results that are not mx.cloudflare.net", () => {
    const parsed = parseCloudflareAuth([
      "mail.attacker.example; dkim=pass header.d=github.com; dmarc=pass header.from=github.com",
      ...cfPass,
    ]);
    assert.equal(parsed?.authservId, "mx.cloudflare.net");
    assert.equal(parsed?.dkimDomain, "github.com");
  });
});

describe("classify", () => {
  it("marks untrusted when Cloudflare auth is missing", () => {
    const result = classify({
      authResultsHeaders: ["evil.example; dmarc=pass header.from=github.com"],
      headerFrom: "notifications@github.com",
      envelopeFrom: "notifications@github.com",
      subject: "New issue",
      githubRecipient: null,
      githubRecipientAddress: null,
      listId: null,
      cc: null,
      text: "hello",
      html: null,
    });
    assert.equal(result.source, "untrusted");
  });

  it("classifies GitHub notifications", () => {
    const result = classify({
      authResultsHeaders: cfPass,
      headerFrom: "GitHub <notifications@github.com>",
      envelopeFrom: "noreply@github.com",
      subject: "[org/repo] New comment",
      githubRecipient: "user",
      githubRecipientAddress: "git@example.com",
      listId: "org/repo <repo.org.github.com>",
      cc: "subscribed@noreply.github.com",
      text: "A comment was added",
      html: null,
    });
    assert.equal(result.source, "github");
    assert.equal(result.githubReason, "subscribed");
  });

  it("classifies GitHub verification as verify", () => {
    const result = classify({
      authResultsHeaders: [
        "mx.cloudflare.net; dkim=pass header.d=github.com; dmarc=pass header.from=github.com",
      ],
      headerFrom: "GitHub <noreply@github.com>",
      envelopeFrom: "noreply@github.com",
      subject: "Verify your email address",
      githubRecipient: null,
      githubRecipientAddress: null,
      listId: null,
      cc: null,
      text: "Please verify https://github.com/verify-email",
      html: null,
    });
    assert.equal(result.source, "verify");
    assert.equal(result.platform, "github");
  });

  it("classifies Gitee even when envelope is SendCloud", () => {
    const result = classify({
      authResultsHeaders: [
        "mx.cloudflare.net; dkim=pass header.d=gitee.com; spf=pass smtp.mailfrom=sendcloud.net; dmarc=pass header.from=gitee.com",
      ],
      headerFrom: "noreply@gitee.com",
      envelopeFrom: "bounce@sendcloud.net",
      subject: "[Gitee] 有人评论了你的 Issue",
      githubRecipient: null,
      githubRecipientAddress: null,
      listId: null,
      cc: null,
      text: "评论内容",
      html: null,
    });
    assert.equal(result.source, "gitee");
  });

  it("classifies Gitee activation as verify", () => {
    const result = classify({
      authResultsHeaders: [
        "mx.cloudflare.net; dkim=pass header.d=gitmail.oschina.net; dmarc=pass header.from=gitee.com",
      ],
      headerFrom: "noreply@gitee.com",
      envelopeFrom: "bounce@mailer.oschina.net",
      subject: "请激活你的 Gitee 账号",
      githubRecipient: null,
      githubRecipientAddress: null,
      listId: null,
      cc: null,
      text: "点击链接激活账号",
      html: null,
    });
    assert.equal(result.source, "verify");
    assert.equal(result.platform, "gitee");
  });
});

describe("links", () => {
  it("extracts and ranks verification URLs", () => {
    const links = extractLinks(
      "see https://example.com/n",
      `<a href="https://github.com/users/verify?token=abc">verify</a>`,
    );
    const ranked = rankLinks(links);
    assert.equal(ranked[0]?.verify, true);
    assert.match(ranked[0]?.href ?? "", /github\.com/);
  });
});
