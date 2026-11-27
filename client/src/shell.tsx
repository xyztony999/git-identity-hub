import React from "react";
import { MailOutlined as MailOutlinedIcon } from "@mui/icons-material";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

export function Shell(props: { email: string; user: string | null; children: ReactNode }) {
  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 1, flexWrap: "wrap" }}>
          <MailOutlinedIcon color="primary" aria-hidden />
          <Typography variant="h6" component={RouterLink} to="/" sx={{ color: "inherit", textDecoration: "none", mr: 1 }}>
            来信
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
            {props.email}
          </Typography>
          <Button component={RouterLink} to="/" color="inherit">
            账册
          </Button>
          <Button component={RouterLink} to="/identity" color="inherit">
            身份
          </Button>
          <Button component={RouterLink} to="/settings" color="inherit">
            设置
          </Button>
        </Toolbar>
        {props.user ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, display: "block" }}>
            {props.user}
          </Typography>
        ) : null}
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box>{props.children}</Box>
      </Container>
    </>
  );
}
