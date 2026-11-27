# git-identity-hub

Cloudflare Worker：用 Email Routing 把 Git 平台邮件收进收件箱，按 DMARC/DKIM 分类，用 Access 保护 HTTP 界面。界面是 Material UI。

开源协议：[MIT](./LICENSE)

不要把个人姓名、私人邮箱、其它转发别名写进 Git。邮箱路由、自定义域、Access 在 Cloudflare Dashboard 配置。带真实 D1/KV ID、域名的 `wrangler.jsonc` **不要进公开仓库**（已 gitignore）；fork 从 `wrangler.example.jsonc` 复制。

## 功能

- `email()` 入站 → 分类（github / gitee / verify / other / untrusted）→ D1 索引
- 原始 eml 写入 KV（账号开通 R2 后可把 `MAIL` 换成 R2）
- Access 保护的信件列表 / 详情 / 身份页 / 设置页
- 设置页可改 `user.name`、`user.email`、外观、验证信转发（已验证 destination）、浏览器通知
- 默认不转发。验证信可转到 Cloudflare 里已验证的 destination

## 别人怎么部署

推荐：**Fork → 用自己的 D1/KV → Workers Builds 接仓库 → Dashboard 配 Email Routing 与 Access**。

完整步骤、Secrets、常见问题见 **[docs/deploy.md](./docs/deploy.md)**。

没有一键拷贝别人线上环境的方式；每人必须用自己的 Cloudflare 资源。本仓库 GitHub Actions 只跑测试，部署走 Cloudflare Workers Builds 或本机 `wrangler deploy`。

## 本地开发

```bash
cp wrangler.example.jsonc wrangler.jsonc   # 填自己的资源 ID
npm install
npm test
npx wrangler d1 execute git-identity-hub --remote --file=schema.sql
npx wrangler deploy
```

分类与界面测试：`npm test`

## 注意

- Email Routing 规则放在 Dashboard，**不要**写进 `addresses`，否则 CI 部署会和现有规则冲突
- `IDENTITY_NAME` / `PUBLIC_MAILBOX` 只在身份表还没有记录时作默认值；之后在设置页改
- 改设置里的邮箱不会改收信路由
