import React from "react";
import { Paper, Stack, Typography } from "@mui/material";
import type { Identity } from "../types";

export function IdentityPage(props: { identity: Identity }) {
  const identity = props.identity;
  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        提交用这一套
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Typography component="pre" sx={{ whiteSpace: "pre-wrap", m: 0, fontFamily: "ui-monospace, monospace" }}>
            {`git config --global user.name  "${identity.user_name}"\ngit config --global user.email "${identity.user_email}"`}
          </Typography>
          <Meta label="显示名" value={identity.user_name} />
          <Meta label="公开邮箱" value={identity.user_email} />
          <Meta label="GPG 指纹" value={identity.gpg_fingerprint || "未写入，私钥留在本机"} />
          <Meta label="GitHub" value={identity.github_verified ? "已记下验证" : "还没有验证信"} />
          <Meta label="Gitee" value={identity.gitee_verified ? "已记下验证" : "还没有验证信"} />
          <Typography color="text.secondary">密钥和登录凭据不放进这个账册。验证信打开后，点信里的链接完成确认。</Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

function Meta(props: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
      <Typography>{props.value}</Typography>
    </Stack>
  );
}
