export type GitIdentityInput =
  | { ok: true; userName: string; userEmail: string }
  | { ok: false; message: string };

export function parseGitIdentity(name: unknown, email: unknown): GitIdentityInput {
  const userName = typeof name === "string" ? name.trim() : "";
  const userEmail = typeof email === "string" ? email.trim() : "";
  if (!userName) return { ok: false, message: "名称不能为空。" };
  if (userName.length > 80) return { ok: false, message: "名称太长。请控制在 80 个字符以内。" };
  if (/[\r\n"\\]/.test(userName)) return { ok: false, message: "名称里不要换行、引号或反斜杠。" };
  if (userEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return { ok: false, message: "邮箱格式不对。写成 name@example.com。" };
  }
  if (/[\r\n"\\]/.test(userEmail)) return { ok: false, message: "邮箱里不要换行或引号。" };
  return { ok: true, userName, userEmail };
}
