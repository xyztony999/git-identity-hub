import { Alert, Button, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import type { ThemeChoice } from "../types";

export function SettingsPage(props: {
  userName: string;
  userEmail: string;
  forwardTo: string | null;
  destinations: string[];
  destinationsMessage: string | null;
  theme: ThemeChoice;
  pushPublicKey: string | null;
  notice: string | null;
  error: string | null;
  onSaveForward?: (value: string) => void;
  onSaveTheme?: (value: ThemeChoice) => void;
  onSaveIdentity?: (value: { userName: string; userEmail: string }) => void;
}) {
  const known = props.destinations.some((email) => email.toLowerCase() === (props.forwardTo ?? "").toLowerCase());
  const [userName, setUserName] = useState(props.userName);
  const [userEmail, setUserEmail] = useState(props.userEmail);
  const [forward, setForward] = useState(known ? props.forwardTo ?? "" : "");
  const [theme, setTheme] = useState<ThemeChoice>(props.theme);
  const [pushText, setPushText] = useState("正在检查这台浏览器。");
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    setUserName(props.userName);
    setUserEmail(props.userEmail);
  }, [props.userName, props.userEmail]);
  useEffect(() => {
    const stillKnown = props.destinations.some((email) => email.toLowerCase() === (props.forwardTo ?? "").toLowerCase());
    setForward(stillKnown ? props.forwardTo ?? "" : "");
  }, [props.forwardTo, props.destinations]);
  useEffect(() => {
    setTheme(props.theme);
  }, [props.theme]);
  useEffect(() => {
    let cancel = false;
    currentSubscription()
      .then((sub) => {
        if (!cancel) setPushOn(Boolean(sub));
      })
      .catch(() => {
        if (!cancel) setPushOn(false);
      });
    return () => {
      cancel = true;
    };
  }, [props.pushPublicKey]);

  useEffect(() => {
    if (!props.pushPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushText("这台浏览器不支持通知。");
      return;
    }
    if (pushOn) {
      setPushText("这台浏览器会收到新来信。页面关着也会响。");
      return;
    }
    if (Notification.permission === "denied") {
      setPushText("浏览器拒绝了通知。到站点设置里允许后再开启。");
      return;
    }
    setPushText("还没开。开启后，新来信会推到这台浏览器。");
  }, [props.pushPublicKey, pushOn]);

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        设置
      </Typography>
      {props.notice ? <Alert severity="success">{props.notice}</Alert> : null}
      {props.error ? <Alert severity="error">{props.error}</Alert> : null}
      <Stack spacing={1} component="form" onSubmit={(event) => event.preventDefault()}>
        <Typography variant="h6">Git 身份</Typography>
        <Typography color="text.secondary">
          这两项会出现在身份页的 git config 里。第一次部署时，没有记录就用 wrangler 里的 IDENTITY_NAME 和 PUBLIC_MAILBOX。收信地址仍在 Cloudflare Email Routing 里配置，改这里不会改路由。
        </Typography>
        <TextField label="user.name" value={userName} onChange={(event) => setUserName(event.target.value)} fullWidth />
        <TextField label="user.email" type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} fullWidth />
        <Button
          variant="contained"
          type="button"
          onClick={() => props.onSaveIdentity?.({ userName: userName.trim(), userEmail: userEmail.trim() })}
          sx={{ alignSelf: "flex-start" }}
        >
          保存身份
        </Button>
      </Stack>
      <Stack spacing={1} component="form" onSubmit={(event) => event.preventDefault()}>
        <Typography variant="h6">验证信转发</Typography>
        <Typography color="text.secondary">
          从 Cloudflare Email Routing 里已验证的地址中选。只有分类为「验证」的信会转到这个地址。GitHub 通知和 Gitee 绑定信仍只记在账册里。选「不转发」就只留在账册。
        </Typography>
        {props.destinationsMessage ? <Alert severity="warning">{props.destinationsMessage}</Alert> : null}
        {props.forwardTo && !known ? (
          <Alert severity="warning">当前地址不在已验证列表里。请重新选择，或选不转发。</Alert>
        ) : null}
        <TextField
          select
          label="转发到"
          value={forward}
          onChange={(event) => setForward(event.target.value)}
          fullWidth
          disabled={props.destinations.length === 0}
        >
          <MenuItem value="">不转发</MenuItem>
          {props.destinations.map((email) => (
            <MenuItem key={email} value={email}>
              {email}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" type="button" onClick={() => props.onSaveForward?.(forward.trim())} sx={{ alignSelf: "flex-start" }}>
          保存转发
        </Button>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="h6">外观</Typography>
        <Typography color="text.secondary">浅色、暗色，或跟随这台设备的外观。</Typography>
        <RadioGroup value={theme} onChange={(event) => setTheme(event.target.value as ThemeChoice)}>
          <FormControlLabel value="light" control={<Radio />} label="浅色" />
          <FormControlLabel value="dark" control={<Radio />} label="暗色" />
          <FormControlLabel value="system" control={<Radio />} label="跟随系统" />
        </RadioGroup>
        <Button variant="contained" onClick={() => props.onSaveTheme?.(theme)} sx={{ alignSelf: "flex-start" }}>
          保存外观
        </Button>
      </Stack>
      <Stack spacing={1}>
        <Typography variant="h6">浏览器通知</Typography>
        {props.pushPublicKey ? (
          <>
            <Typography color="text.secondary">不转发时，新来信可以推到这台浏览器。页面关着也会响。先允许通知，再点开启。</Typography>
            <Typography color="text.secondary">{pushText}</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={pushOn} onClick={() => enablePush(props.pushPublicKey || "", setPushOn, setPushText)}>
                开启通知
              </Button>
              <Button variant="outlined" disabled={!pushOn} onClick={() => disablePush(setPushOn, setPushText)}>
                关闭通知
              </Button>
            </Stack>
          </>
        ) : (
          <Typography color="text.secondary">通知密钥还没配好，这台账册暂时不能推送。</Typography>
        )}
      </Stack>
    </Stack>
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

async function enablePush(publicKey: string, setOn: (value: boolean) => void, setText: (value: string) => void) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setText("没有允许通知。浏览器不会响。");
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey) as BufferSource,
    });
    const response = await fetch("/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!response.ok) {
      setText("订阅没有保存。过一会儿再试。");
      return;
    }
    setOn(true);
  } catch {
    setText("没有订上。确认浏览器允许通知后再试。");
  }
}

async function disablePush(setOn: (value: boolean) => void, setText: (value: string) => void) {
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch("/push/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }
    setOn(false);
  } catch {
    setText("没有关掉。再点一次关闭通知。");
  }
}

function keyBytes(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
