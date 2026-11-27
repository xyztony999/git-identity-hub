import { ArrowBack, Download } from "@mui/icons-material";
import { Button, Chip, Paper, Stack, Typography } from "@mui/material";
import React from "react";
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
      style={{ width: "100%", minHeight: "28rem", border: 0, background: "#fff", borderRadius: 8 }}
    />
  ) : msg.text_preview ? (
    <Typography component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", m: 0 }}>
      {msg.text_preview}
    </Typography>
  ) : (
    <Typography color="text.secondary">这封信没有可读正文。下载原始邮件查看。</Typography>
  );

  return (
    <Stack spacing={1}>
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBack />}
        color="inherit"
        sx={{ alignSelf: "flex-start", ml: -1 }}
      >
        返回
      </Button>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Chip size="small" label={sourceLabel(msg.source)} variant="outlined" />
            <AuthChip name="DMARC" value={msg.auth_dmarc} />
            <AuthChip name="DKIM" value={msg.auth_dkim} />
          </Stack>
          <Typography variant="h5" component="h1">
            {msg.subject || "无主题"}
          </Typography>
          <Stack spacing={1.25}>
            <Meta label="时间" value={formatTime(msg.received_at)} />
            <Meta label="发件人" value={msg.header_from || "无"} />
            <Meta label="信封" value={msg.envelope_from || "无"} />
            <Meta label="收件" value={msg.rcpt_to || "无"} />
            {msg.github_reason ? <Meta label="订阅" value={msg.github_reason} /> : null}
          </Stack>
          {body}
          {msg.has_raw ? (
            <Button
              component="a"
              href={`/m/${encodeURIComponent(msg.id)}/raw`}
              startIcon={<Download />}
              variant="text"
              sx={{ alignSelf: "flex-start" }}
            >
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

function AuthChip(props: { name: string; value: string | null }) {
  const value = props.value?.toLowerCase() ?? "";
  const pass = value === "pass";
  const fail = value === "fail" || value === "permerror" || value === "temperror";
  const label = pass ? `${props.name} 通过` : value ? `${props.name} ${value}` : `${props.name} 无记录`;
  return (
    <Chip
      size="small"
      label={label}
      color={pass ? "success" : fail ? "error" : "default"}
      variant={pass || fail ? "filled" : "outlined"}
    />
  );
}

function Meta(props: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {props.value}
      </Typography>
    </Stack>
  );
}

function framedHtml(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font:16px/1.55 Roboto,sans-serif;margin:1rem;color:#1c1712;}a{color:#c23b22;}img{max-width:100%;}</style></head><body>${html}</body></html>`;
}
