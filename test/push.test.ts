import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asSub, notificationCopy, parseSubs, removeSub, serviceWorkerScript, upsertSub } from "../src/push.ts";

const sub = {
  endpoint: "https://push.example.com/send/abc",
  expirationTime: null,
  keys: { auth: "aaaaaaaaaaaa", p256dh: "bbbbbbbbbbbb" },
};

describe("push subscriptions", () => {
  it("rejects non-https endpoints", () => {
    assert.equal(asSub({ ...sub, endpoint: "http://push.example.com/send" }), null);
  });

  it("replaces the same endpoint and drops the oldest past eight", () => {
    let list = parseSubs(null);
    for (let i = 0; i < 9; i++) {
      list = upsertSub(list, { ...sub, endpoint: `https://push.example.com/send/${i}` });
    }
    assert.equal(list.length, 8);
    assert.equal(list[0]?.endpoint, "https://push.example.com/send/1");
    assert.equal(list.at(-1)?.endpoint, "https://push.example.com/send/8");
    list = upsertSub(list, { ...sub, endpoint: "https://push.example.com/send/8", keys: { auth: "cccccccccccc", p256dh: "bbbbbbbbbbbb" } });
    assert.equal(list.filter((item) => item.endpoint.endsWith("/8")).length, 1);
    assert.equal(removeSub(list, "https://push.example.com/send/8").length, 7);
  });
});

describe("notification copy", () => {
  it("names the source and subject without the envelope", () => {
    const copy = notificationCopy({ source: "verify", subject: "Please verify your email address" });
    assert.equal(copy.title, "新来信");
    assert.match(copy.body, /验证/);
    assert.match(copy.body, /Please verify your email address/);
    assert.doesNotMatch(copy.body, /@/);
  });
});

describe("service worker", () => {
  it("shows a notification and opens a same-origin path", () => {
    const script = serviceWorkerScript();
    assert.match(script, /addEventListener\("push"/);
    assert.match(script, /showNotification/);
    assert.match(script, /startsWith\("\/"\)/);
    assert.doesNotMatch(script, /https?:\/\//);
  });
});

