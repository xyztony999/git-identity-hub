# git-identity-hub

Cloudflare Worker：用 Email Routing 把 Git 平台邮件收进收件箱，按 DMARC/DKIM 分类，用 Access 保护 HTTP 界面。

这是可自行部署的模板。仓库里**不要**提交真实邮箱、姓名、域名、Workers 子域、D1/KV ID、Access 策略。

## 功能

- `email()` 入站 → 分类（github / gitee / verify / other / untrusted）→ D1 索引
- 原始 eml 写入 KV（账号开通 R2 后可把 `MAIL` 换成 R2）
- Access 保护的信件列表 / 详情（可打开验证链接）/ 身份页
- 默认不转发。若要备份验证信，在 KV `CONFIG` 写入键 `forward_verify_to`，值必须是账号内已验证 destination

## 部署

1. 复制 `wrangler.example.jsonc` 为 `wrangler.jsonc`（该文件已 gitignore）
2. 填入自己的邮箱路由地址、D1、KV、显示名
3. 自定义域、Access、Email Routing 规则在 Cloudflare Dashboard 配置，不要写进 Git
4. `npm install && npx wrangler d1 execute git-identity-hub --file=schema.sql && npx wrangler deploy`

分类测试：`npm test`
