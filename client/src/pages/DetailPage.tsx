import React from "react";
import { Button, Chip, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { formatTime, sourceLabel } from "../labels";
import type { MessageDetail } from "../types";

export function DetailPage(props: { message: MessageDetail }) {
  const msg = props.message;
  const body = msg.html ? (
    <iframe
      title="信件正文"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      srcDoc={framedHtml(msg.html)}
      style={{ width: "100%", minHeight: "26rem", border: 0, background: "#fff" }}
    />
  ) : msg.text_preview ? (
    <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
      {msg.text_preview}
    </Typography>
  ) : (
    <Typography color="text.secondary">这封信没有可读正文。下载原始邮件查看。</Typography>
  );

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/" sx={{ alignSelf: "flex-start" }}>
        合上这封信，回账册
      </Button>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Chip
            label={sourceLabel(msg.source)}
            color={msg.source === "verify" || msg.source === "untrusted" ? "primary" : "default"}
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography variant="h4" component="h1">
            {msg.subject || "无主题"}
          </Typography>
          <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Meta label="时间" value={formatTime(msg.received_at)} />
            <Meta label="头 From" value={msg.header_from || "无"} />
            <Meta label="信封" value={msg.envelope_from || "无"} />
            <Meta label="收件" value={msg.rcpt_to || "无"} />
            <Meta label="DMARC" value={msg.auth_dmarc || "无记录"} />
            <Meta label="DKIM" value={msg.auth_dkim || "无记录"} />
            {msg.github_reason ? <Meta label="订阅" value={msg.github_reason} /> : null}
          </Stack>
          {msg.links.length > 0 ? (
            <Stack spacing={1}>
              <Typography variant="h6">信里的链接</Typography>
              {msg.links.map((href) => (
                <Link key={href} href={href} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: "break-all" }}>
                  {href}
                </Link>
              ))}
            </Stack>
          ) : null}
          {body}
          {msg.has_raw ? (
            <Button component="a" href={`/m/${encodeURIComponent(msg.id)}/raw`}>
              下载原始邮件
            </Button>
          ) : (
            <Typography color="text.secondary">这封信没有保存原始邮件。</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function Meta(props: { label: string; value: string }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
        {props.value}
      </Typography>
    </Stack>
  );
}

function framedHtml(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:16px/1.55 Roboto,sans-serif;margin:1rem;color:#1c1712;}a{color:#c23b22;}img{max-width:100%;}</style></head><body>${html}</body></html>`;
}
