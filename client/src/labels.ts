import type { MailSource } from "./types";

export function sourceLabel(source: string): string {
  switch (source) {
    case "github":
      return "GitHub";
    case "gitee":
      return "Gitee";
    case "verify":
      return "验证";
    case "other":
      return "其它";
    case "untrusted":
      return "未认证";
    default:
      return source;
  }
}

export const SOURCES: MailSource[] = ["github", "gitee", "verify", "other", "untrusted"];

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}
