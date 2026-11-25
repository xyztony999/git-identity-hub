CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  received_at INTEGER NOT NULL,
  envelope_from TEXT,
  header_from TEXT,
  rcpt_to TEXT,
  source TEXT NOT NULL,
  auth_dmarc TEXT,
  auth_dkim TEXT,
  subject TEXT,
  r2_key TEXT,
  size_bytes INTEGER,
  github_reason TEXT,
  text_preview TEXT,
  html TEXT,
  links TEXT,
  read INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_msgid_rcpt ON messages(message_id, rcpt_to);
CREATE INDEX IF NOT EXISTS idx_messages_received ON messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);

CREATE TABLE IF NOT EXISTS identity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  gpg_fingerprint TEXT,
  github_verified INTEGER NOT NULL DEFAULT 0,
  gitee_verified INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO identity (id, user_name, user_email)
VALUES (1, 'Git User', 'git@example.com');
