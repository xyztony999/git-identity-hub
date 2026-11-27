import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import { DetailPage } from "../client/src/pages/DetailPage.tsx";
import { IdentityPage } from "../client/src/pages/IdentityPage.tsx";
import { InboxPage } from "../client/src/pages/InboxPage.tsx";
import { SettingsPage } from "../client/src/pages/SettingsPage.tsx";
import { StatusPage } from "../client/src/pages/StatusPage.tsx";
import { Shell } from "../client/src/shell.tsx";
import { appTheme } from "../client/src/theme.ts";
import type { MessageDetail, MessageSummary } from "../client/src/types.ts";

const sample: MessageSummary = {
  id: "11111111-2222-4333-8444-555555555555",
  received_at: Date.UTC(2026, 10, 27, 2, 29, 49),
  envelope_from: "bounces+848413-d73d-git=example.com@sgmail.github.com",
  header_from: "GitHub <notifications@github.com>",
  rcpt_to: "git@example.com",
  source: "github",
  auth_dmarc: "pass",
  auth_dkim: "pass",
  subject: "[example/repo] Issue opened",
  github_reason: "subscribed",
  read: 0,
  has_raw: true,
};

const detail: MessageDetail = {
  ...sample,
  text_preview: "A comment was added",
  html: null,
  links: ["https://github.com/example/repo/issues/1"],
};

function render(node: ReactElement): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { theme: appTheme("light") }, createElement(MemoryRouter, null, node)),
  );
}

describe("inbox", () => {
  it("renders an empty Material list with the next step", () => {
    const html = render(
      createElement(Shell, { email: "git@example.com", user: null }, createElement(InboxPage, { messages: [], source: null, identityEmail: "git@example.com" })),
    );
    assert.match(html, /MuiAppBar-root/);
    assert.match(html, /账册还是空的/);
    assert.match(html, /git@example\.com/);
    assert.match(html, /href="\/settings"/);
    assert.doesNotMatch(html, /Access/);
  });

  it("renders a filtered empty state with a way back", () => {
    const html = render(createElement(InboxPage, { messages: [], source: "verify", identityEmail: "git@example.com" }));
    assert.match(html, /没有「验证」类记录/);
    assert.match(html, /href="\/"/);
  });

  it("renders mail rows", () => {
    const html = render(createElement(InboxPage, { messages: [sample], source: null, identityEmail: "git@example.com" }));
    assert.match(html, /MuiList-root/);
    assert.match(html, /\/m\/11111111-2222-4333-8444-555555555555/);
    assert.match(html, /\[example\/repo\] Issue opened/);
    assert.match(html, /GitHub/);
  });

  it("does not give GitHub and Gitee separate theme colors", () => {
    const html = render(
      createElement(InboxPage, {
        messages: [sample, { ...sample, id: "22222222-2222-4333-8444-555555555555", source: "gitee", subject: "Gitee 评论" }],
        source: null,
        identityEmail: "git@example.com",
      }),
    );
    assert.match(html, /GitHub/);
    assert.match(html, /Gitee/);
    assert.doesNotMatch(html, /#9ec27c|#e08a7a|#238636|#c71d23/);
  });
});

describe("detail", () => {
  it("opens the message with auth status and a text back button", () => {
    const html = render(createElement(DetailPage, { message: detail }));
    assert.match(html, /MuiPaper-root/);
    assert.match(html, /MuiButton-text/);
    assert.match(html, /ArrowBack/);
    assert.match(html, />返回</);
    assert.match(html, /DMARC 通过/);
    assert.match(html, /DKIM 通过/);
    assert.match(html, /下载原始邮件/);
    assert.doesNotMatch(html, /信里的链接/);
    assert.doesNotMatch(html, /github\.com\/example\/repo\/issues\/1/);
  });
});

describe("identity", () => {
  it("shows git config", () => {
    const html = render(
      createElement(IdentityPage, {
        identity: {
          user_name: "Git User",
          user_email: "git@example.com",
          gpg_fingerprint: null,
          github_verified: 0,
          gitee_verified: 0,
        },
      }),
    );
    assert.match(html, /提交用这一套/);
    assert.match(html, /user\.email/);
    assert.match(html, /git@example\.com/);
    assert.match(html, /还没有验证信/);
  });
});

describe("errors", () => {
  it("says the result and the next step", () => {
    const html = render(createElement(StatusPage, { title: "没有这封信", message: "账册里找不到这封信。回到列表看最近的记录。", action: "回账册", to: "/" }));
    assert.match(html, /没有这封信/);
    assert.match(html, /回账册/);
    assert.match(html, /MuiAlert-root/);
  });
});

describe("settings", () => {
  it("offers verify forwarding, theme, and browser notifications", () => {
    const html = render(
      createElement(SettingsPage, {
        forwardTo: "desk@example.com",
        destinations: ["desk@example.com", "other@example.com"],
        destinationsMessage: null,
        theme: "dark",
        pushPublicKey: "BElob-public-key_example",
        notice: "验证信会转到这个地址。",
        error: null,
      }),
    );
    assert.match(html, /已验证的地址中选/);
    assert.match(html, /不转发/);
    assert.match(html, /desk@example.com/);
    assert.match(html, /浅色/);
    assert.match(html, /跟随系统/);
    assert.match(html, /开启通知/);
    assert.match(html, /页面关着也会响/);
    assert.match(html, /desk@example.com/);
  });

  it("says notifications are unavailable without a key", () => {
    const html = render(
      createElement(SettingsPage, {
        forwardTo: null,
        destinations: [],
        destinationsMessage: "还不能读取 Email Routing 里的地址。",
        theme: "system",
        pushPublicKey: null,
        notice: null,
        error: null,
      }),
    );
    assert.match(html, /通知密钥还没配好/);
    assert.doesNotMatch(html, /开启通知/);
  });
});

describe("material shell", () => {
  it("loads Roboto for Material UI", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    assert.match(html, /family=Roboto/);
    assert.match(html, /id="root"/);
  });
});
