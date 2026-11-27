import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detailPage, errorPage, identityPage, inboxPage } from "../src/ui.ts";

const sample = {
  id: "11111111-2222-4333-8444-555555555555",
  message_id: "<example/repo/issue/1@github.com>",
  received_at: Date.UTC(2026, 10, 27, 2, 29, 49),
  envelope_from: "bounces+848413-d73d-git=example.com@sgmail.github.com",
  header_from: "GitHub <notifications@github.com>",
  rcpt_to: "git@example.com",
  source: "github" as const,
  auth_dmarc: "pass",
  auth_dkim: "pass",
  subject: "[example/repo] Issue opened",
  r2_key: "mail/2026/11/11111111-2222-4333-8444-555555555555.eml",
  size_bytes: 33780,
  github_reason: "subscribed",
  text_preview: "A comment was added",
  html: null,
  links: JSON.stringify(["https://github.com/example/repo/issues/1"]),
  read: 0,
};

const banned = ["Inter", "Roboto", "Arial", "Space Grotesk", "system-ui", "Fraunces", "Newsreader", "JetBrains"];

describe("inboxPage", () => {
  it("renders empty ledger with next step", () => {
    const html = inboxPage({
      rows: [],
      source: null,
      identityEmail: "git@example.com",
      user: null,
    });
    assert.match(html, /账册还是空的/);
    assert.match(html, /git@example\.com/);
    assert.match(html, /记在横线上/);
    assert.match(html, /class="stamp"/);
    assert.match(html, /class="chop"/);
    assert.doesNotMatch(html, /Access/);
  });

  it("renders filtered empty with a way back to all", () => {
    const html = inboxPage({
      rows: [],
      source: "verify",
      identityEmail: "git@example.com",
      user: null,
    });
    assert.match(html, /没有「验证」类记录/);
    assert.match(html, /href="\/"/);
  });

  it("renders mail rows on the ledger", () => {
    const html = inboxPage({
      rows: [sample],
      source: null,
      identityEmail: "git@example.com",
      user: "viewer@example.com",
    });
    assert.match(html, /class="ledger"/);
    assert.match(html, /\/m\/11111111-2222-4333-8444-555555555555/);
    assert.match(html, /\[example\/repo\] Issue opened/);
    assert.match(html, /GitHub/);
    assert.match(html, /--i:0/);
    assert.match(html, /class="subj "/);
    assert.doesNotMatch(html, /class="subj read"/);
  });
});

describe("detailPage", () => {
  it("opens as stacked letter paper on the ledger", () => {
    const html = detailPage({
      msg: sample,
      user: "viewer@example.com",
      identityEmail: "git@example.com",
    });
    assert.match(html, /class="stack"/);
    assert.match(html, /class="letter"/);
    assert.match(html, /合上这封信，回账册/);
    assert.match(html, /下载原始邮件/);
    assert.match(html, /信里的链接/);
    assert.match(html, /https:\/\/github\.com\/example\/repo\/issues\/1/);
    assert.doesNotMatch(html, /打开验证链接/);
    assert.doesNotMatch(html, /← 收件箱/);
  });
});

describe("identityPage", () => {
  it("shows git config on letter paper", () => {
    const html = identityPage({
      identity: {
        id: 1,
        user_name: "Git User",
        user_email: "git@example.com",
        gpg_fingerprint: null,
        github_verified: 0,
        gitee_verified: 0,
      },
      user: null,
    });
    assert.match(html, /提交用这一套/);
    assert.match(html, /user\.email "git@example.com"/);
    assert.match(html, /还没有验证信/);
    assert.match(html, /class="stack"/);
  });
});

describe("errorPage", () => {
  it("says the result and the next step", () => {
    const html = errorPage({
      user: null,
      identityEmail: "git@example.com",
      title: "没有这封信",
      message: "账册里找不到这封信。回到列表看最近的记录。",
      next: { href: "/", label: "回账册" },
    });
    assert.match(html, /没有这封信/);
    assert.match(html, /回账册/);
    assert.match(html, /class="empty-sheet"/);
    assert.match(html, /class="stamp"/);
  });
});

describe("aesthetic contract", () => {
  it("uses the ledger typefaces and cinnabar token", () => {
    const html = inboxPage({
      rows: [sample],
      source: null,
      identityEmail: "git@example.com",
      user: null,
    });
    assert.match(html, /--font-display:"Instrument Serif"/);
    assert.match(html, /--font-body:"Literata"/);
    assert.match(html, /--font-mono:"Fragment Mono"/);
    assert.match(html, /--seal:#c23b22/);
    assert.match(html, /family=Instrument\+Serif/);
    assert.match(html, /family=Literata/);
    assert.match(html, /family=Fragment\+Mono/);
    for (const name of banned) {
      assert.equal(html.includes(name), false, `must not use ${name}`);
    }
  });

  it("does not give GitHub and Gitee separate theme colors", () => {
    const html = inboxPage({
      rows: [
        sample,
        { ...sample, id: "22222222-2222-4333-8444-555555555555", source: "gitee", subject: "Gitee 评论" },
      ],
      source: null,
      identityEmail: "git@example.com",
      user: null,
    });
    assert.doesNotMatch(html, /#9ec27c|#e08a7a|#238636|#c71d23/);
    assert.match(html, /class="mark github"/);
    assert.match(html, /class="mark gitee"/);
  });
});
