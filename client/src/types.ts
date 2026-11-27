export type MailSource = "github" | "gitee" | "verify" | "other" | "untrusted";
export type ThemeChoice = "light" | "dark" | "system";

export type MessageSummary = {
  id: string;
  received_at: number;
  envelope_from: string | null;
  header_from: string | null;
  rcpt_to: string | null;
  source: MailSource;
  auth_dmarc: string | null;
  auth_dkim: string | null;
  subject: string | null;
  github_reason: string | null;
  read: number;
  has_raw: boolean;
};

export type MessageDetail = MessageSummary & {
  text_preview: string | null;
  html: string | null;
  links: string[];
};

export type Identity = {
  user_name: string;
  user_email: string;
  gpg_fingerprint: string | null;
  github_verified: number;
  gitee_verified: number;
};

export type Bootstrap = {
  user: string | null;
  identity: Identity;
  theme: ThemeChoice;
  forwardTo: string | null;
  pushPublicKey: string | null;
};
