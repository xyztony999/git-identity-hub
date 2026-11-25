# git-identity-hub

Cloudflare Worker：用 Email Routing 把 Git 平台邮件收进收件箱，按 DMARC/DKIM 分类，用 Access 保护 HTTP 界面。

不要把个人姓名、私人邮箱、其它转发别名写进 Git。邮箱路由地址、自定义域、Access 策略在 Cloudflare Dashboard 配置；`wrangler.jsonc` 里的 D1/KV 绑定供 CI 部署到已有 Worker，fork 请改成自己的资源 ID。

## 功能

- `email()` 入站 → 分类（github / gitee / verify / other / untrusted）→ D1 索引
- 原始 eml 写入 KV（账号开通 R2 后可把 `MAIL` 换成 R2）
- Access 保护的信件列表 / 详情（可打开验证链接）/ 身份页
- 默认不转发。若要备份验证信，在 KV `CONFIG` 写入键 `forward_verify_to`，值必须是账号内已验证 destination

## 本地部署

1. 需要时对照 `wrangler.example.jsonc` 改 `wrangler.jsonc`
2. `npm install && npx wrangler d1 execute git-identity-hub --remote --file=schema.sql && npx wrangler deploy`

分类测试：`npm test`

## CI/CD

- GitHub Actions（`.github/workflows/ci.yml`）：`main` 推送和 PR 跑 `npm test`
- Cloudflare Workers Builds：`main` 推送后 `npx wrangler deploy`

Email Routing 规则在 Dashboard 管理，不要写进 `addresses`，否则部署会和现有规则冲突。
