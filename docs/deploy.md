# 部署手册

这份手册面向 fork 本仓库、在自己的 Cloudflare 账号上跑一份 Git 收件箱的人。

本项目跑在 **Cloudflare Workers** 上：邮件从 Email Routing 进 Worker，界面是 Material UI，数据在 D1 和 KV。收信地址、自定义域、Access 登录都在 Cloudflare Dashboard 配置，不要写进 Git。

## 选哪条部署路

| 方式 | 适合谁 | 说明 |
| --- | --- | --- |
| **Workers Builds（推荐）** | 已有 GitHub 账号、愿意点几下 Dashboard | Fork → 在 Cloudflare 接上仓库 → `main` 推送自动部署 |
| **本机 `wrangler deploy`** | 习惯命令行、要先本地调试 | 建资源、改配置、手动部署；以后仍可接 Builds |
| **只测不部署** | 先看代码 | `npm install && npm test`；`wrangler.dev` 可本地预览，但 Email Routing 仍要线上 Worker |

没有「一键复制别人账号」的官方按钮。别人 fork 后必须用**自己的** D1、KV、域名和 Secrets，不能照抄仓库里已有的资源 ID。

## 你需要准备什么

- Cloudflare 账号，且域名的 DNS 已放在 Cloudflare（要用 Email Routing）
- Node.js 22+（本机部署或本地测试时）
- GitHub 账号（走 Workers Builds 时）

## 1. Fork 并准备配置

1. Fork `git-identity-hub`，然后 clone 你自己的仓库。
2. 复制配置模板：

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

3. 先不要提交带真实资源 ID 的 `wrangler.jsonc` 到公开仓库，除非你明确要给自己的 CI 用。模板里的 `YOUR_*` 必须换成你自己的。

## 2. 创建 Cloudflare 资源

在项目目录登录后执行：

```bash
npx wrangler login
npx wrangler d1 create git-identity-hub
npx wrangler kv namespace create git-identity-hub-config
npx wrangler kv namespace create git-identity-hub-mail
```

把命令输出的 `database_id`、两个 KV `id` 填进 `wrangler.jsonc`。

初始化表：

```bash
npx wrangler d1 execute git-identity-hub --remote --file=schema.sql
```

可选：在 `wrangler.jsonc` 的 `vars` 里设初次默认值：

```jsonc
"vars": {
  "PUBLIC_MAILBOX": "git@example.com",
  "IDENTITY_NAME": "Your Name"
}
```

部署后可在设置页改 `user.name` / `user.email`。这两个默认值只在身份表还没有记录时生效。

## 3. Secrets 与浏览器通知

在 Worker 的 **Settings → Variables and Secrets**（或 `wrangler secret put`）里配置：

| 名称 | 必填 | 用途 |
| --- | --- | --- |
| `VAPID_PRIVATE_KEY` | 要用浏览器通知时必填 | Web Push 私钥，不要进 Git |
| `VAPID_PUBLIC_KEY` | 同上 | 可放 `vars`；需与私钥成对 |
| `VAPID_SUBJECT` | 建议填 | 如 `mailto:you@example.com` 或站点 URL |
| `CF_API_TOKEN` | 设置页要列出 destination 时必填 | 只开 **Email Routing Addresses → Read** |
| `CF_ACCOUNT_ID` | 同上 | Cloudflare 账号 ID |

生成 VAPID 密钥（示例，在本机 Node 里跑一次即可）：

```bash
node --input-type=module -e '
import { webcrypto } from "node:crypto";
const key = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const jwk = await webcrypto.subtle.exportKey("jwk", key.privateKey);
const raw = new Uint8Array(await webcrypto.subtle.exportKey("raw", key.publicKey));
console.log("public:", Buffer.from(raw).toString("base64url"));
console.log("private:", jwk.d);
'
```

把公钥放进 `wrangler.jsonc` 的 `vars.VAPID_PUBLIC_KEY`，私钥用 Secret 写入，不要提交私钥。

`CF_API_TOKEN` 只读 Email Routing 的已验证 destination，给设置页下拉框用。没有它时，设置页会提示读不到地址，其它功能仍可用。

## 4. 部署 Worker

### 本机部署

```bash
npm install
npm test
npx wrangler deploy
```

`wrangler.jsonc` 里已配置 `build.command`，部署前会构建 Material UI 前端。

### Workers Builds（推荐长期用法）

1. Cloudflare Dashboard → **Workers & Pages** → 你的 Worker（或新建）→ **Settings → Builds**
2. 连接你 fork 后的 GitHub 仓库，分支选 `main`
3. 构建/部署命令保持用项目里的 `wrangler deploy`（会跑 `npm run build:client`）
4. 在 Builds 环境里配置与上面相同的 Secrets；D1/KV 绑定仍以仓库里的 `wrangler.jsonc` 为准

本仓库的 GitHub Actions **只跑测试**，不负责部署，也不需要 Cloudflare API Token 进 Actions。

## 5. 自定义域与 Access

1. 给 Worker 绑自定义域，例如 `git.example.com`（Workers 自定义域通常会写入一条 proxied 的 AAAA `100::`，不要自己先建冲突的 CNAME）。
2. 在 Zero Trust → Access 里保护这个域名，只允许你自己的登录方式。
3. workers.dev 子域若也要访问，同样加进 Access 应用。

界面依赖 Access 头 `Cf-Access-Authenticated-User-Email`。没有 Access 时，设置页仍可用，但顶栏可能没有登录邮箱。

## 6. Email Routing

1. 域名开启 Email Routing。
2. **不要**把收信地址写进 `wrangler.jsonc` 的 `addresses`。Dashboard 已有规则时，CI 部署会抢路由。
3. 新增一条规则：例如 `git@example.com` → **Send to a Worker** → 选 `git-identity-hub`。
4. 已有其它转发规则（个人邮箱、Office 等）保持不动，只加这一条。
5. 在 Email Routing 里验证你要用的 destination（真实邮箱）。设置页转发验证信时，只能选已验证的地址。

## 7. 部署后检查

1. 打开 `https://你的域名/`，应出现 Access 登录后的收件箱。
2. 设置页填写 `user.name` / `user.email`。
3. 若配了 `CF_API_TOKEN`，验证信转发应能列出 destination。
4. 若配了 VAPID，可在设置里开启浏览器通知。
5. 向 `git@你的域名` 发一封测试信，确认列表出现记录。

## 常见问题

**Fork 后还看到别人的 D1/KV ID**  
把 `wrangler.jsonc` 换成你自己资源，或从 `wrangler.example.jsonc` 重新复制再填。

**部署提示 Email Routing / addresses 冲突**  
配置里不要写 `addresses`。规则只在 Dashboard 维护。

**设置页说读不到 Email Routing 地址**  
Worker Secrets 里缺 `CF_API_TOKEN` 或 `CF_ACCOUNT_ID`，或 token 权限不是 Addresses Read。

**浏览器通知不开**  
检查 `VAPID_PUBLIC_KEY` 与 `VAPID_PRIVATE_KEY` 是否成对；每个浏览器要单独点一次开启。

**改了设置里的邮箱，信却没进 Worker**  
设置里的 `user.email` 只影响身份展示和 git config 文案，不改路由。收信仍看 Email Routing 规则。

## 许可证

见仓库根目录 [LICENSE](../LICENSE)（MIT）。
