interface Env {
  DB: D1Database;
  CONFIG: KVNamespace;
  MAIL: KVNamespace;
  PUBLIC_MAILBOX: string;
  IDENTITY_NAME: string;
}

type MailSource = "github" | "gitee" | "verify" | "other" | "untrusted";

interface StoredMessage {
  id: string;
  message_id: string | null;
  received_at: number;
  envelope_from: string | null;
  header_from: string | null;
  rcpt_to: string | null;
  source: MailSource;
  auth_dmarc: string | null;
  auth_dkim: string | null;
  subject: string | null;
  r2_key: string | null;
  size_bytes: number | null;
  github_reason: string | null;
  text_preview: string | null;
  html: string | null;
  links: string | null;
  read: number;
}

interface IdentityRow {
  id: number;
  user_name: string;
  user_email: string;
  gpg_fingerprint: string | null;
  github_verified: number;
  gitee_verified: number;
}
