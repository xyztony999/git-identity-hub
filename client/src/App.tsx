import { CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { ApiError, getJson, postJson } from "./api";
import { DetailPage } from "./pages/DetailPage";
import { IdentityPage } from "./pages/IdentityPage";
import { InboxPage } from "./pages/InboxPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatusPage } from "./pages/StatusPage";
import { Shell } from "./shell";
import { appTheme } from "./theme";
import type { Bootstrap, MessageDetail, MessageSummary, ThemeChoice } from "./types";

export function App() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    getJson<Bootstrap>("/api/bootstrap")
      .then(setBoot)
      .catch((err: unknown) => setBootError(err instanceof Error ? err.message : "账册没有打开。刷新再试。"));
  }, []);

  useEffect(() => {
    if (!boot) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = boot.theme === "system" ? (query.matches ? "dark" : "light") : boot.theme;
      setMode(next);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [boot]);

  const theme = useMemo(() => appTheme(mode), [mode]);

  if (bootError) {
    return (
      <ThemeProvider theme={appTheme("light")}>
        <CssBaseline />
        <Shell email="" user={null}>
          <StatusPage title="没有打开" message={bootError} action="回账册" to="/" />
        </Shell>
      </ThemeProvider>
    );
  }
  if (!boot) {
    return (
      <ThemeProvider theme={appTheme("light")}>
        <CssBaseline />
        <Shell email="" user={null}>
          <CircularProgress aria-label="正在加载" />
        </Shell>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Shell email={boot.identity.user_email} user={boot.user}>
        <Routes>
          <Route path="/" element={<InboxRoute email={boot.identity.user_email} />} />
          <Route path="/m/:id" element={<DetailRoute />} />
          <Route path="/identity" element={<IdentityPage identity={boot.identity} />} />
          <Route path="/settings" element={<SettingsRoute boot={boot} onBoot={setBoot} />} />
          <Route path="*" element={<StatusPage title="没有这个页面" message="地址不对。回到账册继续看信。" action="回账册" to="/" />} />
        </Routes>
      </Shell>
    </ThemeProvider>
  );
}

function InboxRoute(props: { email: string }) {
  const [params] = useSearchParams();
  const source = params.get("source");
  const [rows, setRows] = useState<MessageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const query = source ? `?source=${encodeURIComponent(source)}` : "";
    getJson<{ messages: MessageSummary[] }>(`/api/messages${query}`)
      .then((body) => setRows(body.messages))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "列表没有载入。刷新再试。"));
  }, [source]);
  if (error) return <StatusPage title="列表没有载入" message={error} action="回账册" to="/" />;
  if (!rows) return <CircularProgress aria-label="正在加载来信" />;
  return <InboxPage messages={rows} source={source} identityEmail={props.email} />;
}

function DetailRoute() {
  const { id = "" } = useParams();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getJson<MessageDetail>(`/api/messages/${encodeURIComponent(id)}`)
      .then(setMessage)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setError(err instanceof Error ? err.message : "这封信没有打开。");
      });
  }, [id]);
  if (missing) return <StatusPage title="没有这封信" message="账册里找不到这封信。回到列表看最近的记录。" action="回账册" to="/" />;
  if (error) return <StatusPage title="没有打开" message={error} action="回账册" to="/" />;
  if (!message) return <CircularProgress aria-label="正在打开这封信" />;
  return <DetailPage message={message} />;
}

function SettingsRoute(props: { boot: Bootstrap; onBoot: (next: Bootstrap) => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [destinationsMessage, setDestinationsMessage] = useState<string | null>(null);
  useEffect(() => {
    getJson<{ destinations: string[]; message: string | null }>("/api/destinations")
      .then((body) => {
        setDestinations(body.destinations);
        setDestinationsMessage(body.message);
      })
      .catch((err: unknown) => {
        setDestinations([]);
        setDestinationsMessage(err instanceof Error ? err.message : "没有读到已验证的转发地址。过一会儿再打开设置。");
      });
  }, []);
  async function save(body: { intent: "forward" | "theme"; forward_to?: string; theme?: ThemeChoice }) {
    setError(null);
    setNotice(null);
    try {
      const result = await postJson<{ message: string; theme: ThemeChoice; forwardTo: string | null }>("/api/settings", body);
      setNotice(result.message);
      props.onBoot({ ...props.boot, theme: result.theme, forwardTo: result.forwardTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "没有保存。");
    }
  }
  return (
    <SettingsPage
      forwardTo={props.boot.forwardTo}
      destinations={destinations}
      destinationsMessage={destinationsMessage}
      theme={props.boot.theme}
      pushPublicKey={props.boot.pushPublicKey}
      notice={notice}
      error={error}
      onSaveForward={(value) => save({ intent: "forward", forward_to: value })}
      onSaveTheme={(value) => save({ intent: "theme", theme: value })}
    />
  );
}
