import { buildPushPayload } from "@block65/webcrypto-web-push";

export type PushSub = {
  endpoint: string;
  expirationTime: number | null;
  keys: { auth: string; p256dh: string };
};

const STORE_KEY = "push_subscriptions";
const MAX_SUBS = 8;

export function parseSubs(raw: string | null): PushSub[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const sub = asSub(item);
      return sub ? [sub] : [];
    });
  } catch {
    return [];
  }
}

export function asSub(value: unknown): PushSub | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { auth?: unknown; p256dh?: unknown };
  };
  if (typeof record.endpoint !== "string" || !record.endpoint.startsWith("https://")) return null;
  if (record.endpoint.length > 2000) return null;
  const auth = record.keys?.auth;
  const p256dh = record.keys?.p256dh;
  if (typeof auth !== "string" || typeof p256dh !== "string") return null;
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(auth) || !/^[A-Za-z0-9_-]{8,256}$/.test(p256dh)) return null;
  let expirationTime: number | null = null;
  if (record.expirationTime != null) {
    const n = Number(record.expirationTime);
    if (!Number.isFinite(n)) return null;
    expirationTime = n;
  }
  return { endpoint: record.endpoint, expirationTime, keys: { auth, p256dh } };
}

export function upsertSub(list: PushSub[], next: PushSub): PushSub[] {
  return [...list.filter((item) => item.endpoint !== next.endpoint), next].slice(-MAX_SUBS);
}

export function removeSub(list: PushSub[], endpoint: string): PushSub[] {
  return list.filter((item) => item.endpoint !== endpoint);
}

export function notificationCopy(input: { subject: string | null; source: string }): { title: string; body: string } {
  return {
    title: "新来信",
    body: `${sourceLabel(input.source)} · ${input.subject?.trim() || "无主题"}`,
  };
}

export function serviceWorkerScript(): string {
  return `self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = typeof data.title === "string" && data.title ? data.title : "新来信";
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/";
  event.waitUntil(self.registration.showNotification(title, { body, data: { url } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if (client.url.endsWith(url) && "focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
`;
}

export async function readSubs(env: Env): Promise<PushSub[]> {
  return parseSubs(await env.CONFIG.get(STORE_KEY));
}

export async function writeSubs(env: Env, list: PushSub[]): Promise<void> {
  if (list.length === 0) await env.CONFIG.delete(STORE_KEY);
  else await env.CONFIG.put(STORE_KEY, JSON.stringify(list));
}

export async function notifyNewMail(
  env: Env,
  mail: { id: string; subject: string | null; source: string },
): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const subs = await readSubs(env);
  if (subs.length === 0) return;
  const copy = notificationCopy(mail);
  const data = { title: copy.title, body: copy.body, url: `/m/${mail.id}` };
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        const status = await postPush(env, sub, data);
        if (status === 404 || status === 410) stale.push(sub.endpoint);
      } catch (err) {
        console.log(JSON.stringify({ msg: "push_failed", err: String(err) }));
      }
    }),
  );
  if (stale.length) {
    const latest = await readSubs(env);
    await writeSubs(
      env,
      latest.filter((item) => !stale.includes(item.endpoint)),
    );
  }
}

async function postPush(env: Env, sub: PushSub, data: { title: string; body: string; url: string }): Promise<number> {
  const request = await buildPushPayload(
    { data, options: { ttl: 60 * 60 * 12, urgency: "high", topic: subTopic(data.url) } },
    { endpoint: sub.endpoint, expirationTime: sub.expirationTime, keys: sub.keys },
    {
      subject: env.VAPID_SUBJECT || "https://git.tonyxyz.com",
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
  );
  const response = await fetch(sub.endpoint, request);
  return response.status;
}

function subTopic(url: string): string {
  return url.replace(/[^A-Za-z0-9]/g, "").slice(-32) || "mail";
}

function sourceLabel(source: string): string {
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
      return "来信";
  }
}
