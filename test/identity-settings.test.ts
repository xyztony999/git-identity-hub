import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitIdentity } from "../src/identity-settings.ts";

describe("parseGitIdentity", () => {
  it("accepts a name and email", () => {
    const parsed = parseGitIdentity(" Git User ", "git@example.com");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.userName, "Git User");
      assert.equal(parsed.userEmail, "git@example.com");
    }
  });

  it("rejects an empty name and a broken email", () => {
    assert.equal(parseGitIdentity("  ", "git@example.com").ok, false);
    assert.equal(parseGitIdentity("Git User", "not-an-email").ok, false);
    assert.equal(parseGitIdentity('Bad "name"', "git@example.com").ok, false);
  });
});
