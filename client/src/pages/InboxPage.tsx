import React from "react";
import { Alert, Chip, List, ListItemButton, ListItemText, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { formatTime, SOURCES, sourceLabel } from "../labels";
import type { MessageSummary } from "../types";

export function InboxPage(props: {
  messages: MessageSummary[];
  source: string | null;
  identityEmail: string;
}) {
  return (
    <Stack spacing={2}>
      <ToggleButtonGroup exclusive value={props.source ?? "all"} aria-label="分类" size="small">
        <ToggleButton component={RouterLink} to="/" value="all">
          全部
        </ToggleButton>
        {SOURCES.map((source) => (
          <ToggleButton key={source} component={RouterLink} to={`/?source=${source}`} value={source}>
            {sourceLabel(source)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {props.messages.length === 0 ? (
        <Alert severity="info">
          {props.source ? (
            <>
              没有「{sourceLabel(props.source)}」类记录。看<RouterLink to="/">全部</RouterLink>，或等下一封信。
            </>
          ) : (
            <>
              账册还是空的。把 GitHub 和 Gitee 的公开邮箱设成 {props.identityEmail}。验证信和通知会记在这里。
            </>
          )}
        </Alert>
      ) : (
        <List disablePadding>
          {props.messages.map((row) => (
            <ListItemButton key={row.id} component={RouterLink} to={`/m/${row.id}`} divider>
              <ListItemText
                primary={row.subject || "无主题"}
                secondary={
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={sourceLabel(row.source)}
                      color={row.source === "verify" || row.source === "untrusted" ? "primary" : "default"}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary" component="span">
                      {row.header_from || row.envelope_from || ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {formatTime(row.received_at)}
                    </Typography>
                  </Stack>
                }
                slotProps={{ primary: { sx: { color: row.read ? "text.secondary" : "text.primary" } } }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Stack>
  );
}
