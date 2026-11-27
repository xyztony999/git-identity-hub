import { createTheme } from "@mui/material/styles";

export function appTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
      primary: { main: "#c23b22" },
      background:
        mode === "light"
          ? { default: "#f4f0ea", paper: "#ffffff" }
          : { default: "#121212", paper: "#1e1e1e" },
    },
    typography: {
      fontFamily: '"Roboto", "Noto Sans SC", sans-serif',
    },
    shape: { borderRadius: 8 },
  });
}
