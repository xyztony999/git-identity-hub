import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifiedDestinationEmails } from "../src/destinations.ts";

describe("verifiedDestinationEmails", () => {
  it("keeps verified addresses and drops the public mailbox", () => {
    const emails = verifiedDestinationEmails(
      [
        { email: "desk@example.com", verified: "2026-01-01T00:00:00Z" },
        { email: "Git@example.com", verified: "2026-01-01T00:00:00Z" },
        { email: "pending@example.com", verified: null },
        { email: "desk@example.com", verified: "2026-01-02T00:00:00Z" },
        { email: "not-an-email", verified: "2026-01-01T00:00:00Z" },
      ],
      "git@example.com",
    );
    assert.deepEqual(emails, ["desk@example.com"]);
  });
});
