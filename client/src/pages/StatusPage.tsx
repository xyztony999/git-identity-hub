import React from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function StatusPage(props: { title: string; message: string; action: string; to: string }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        {props.title}
      </Typography>
      <Alert severity="warning">{props.message}</Alert>
      <Button component={RouterLink} to={props.to} variant="contained" sx={{ alignSelf: "flex-start" }}>
        {props.action}
      </Button>
    </Stack>
  );
}
