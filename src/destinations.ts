type DestinationRow = {
  email?: unknown;
  verified?: unknown;
};

export function verifiedDestinationEmails(rows: unknown, identityEmail: string): string[] {
  if (!Array.isArray(rows)) return [];
  const self = identityEmail.trim().toLowerCase();
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as DestinationRow;
    if (!record.verified) continue;
    if (typeof record.email !== "string") continue;
    const email = record.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const key = email.toLowerCase();
    if (key === self || seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}
