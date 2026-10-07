import assert from "node:assert/strict";
import test from "node:test";

async function loadPolicy() {
  try {
    return await import("./trustedRenderer.cjs");
  } catch {
    return {};
  }
}

test("trusts the packaged renderer and configured development origin only", async () => {
  const { isTrustedRendererUrl } = await loadPolicy();

  assert.equal(
    isTrustedRendererUrl?.(
      "file:///C:/app/dist/index.html#workspace",
      "file:///C:/app/dist/index.html",
    ),
    true,
  );
  assert.equal(
    isTrustedRendererUrl?.("file:///C:/Users/user/untrusted.html", "file:///C:/app/dist/index.html"),
    false,
  );
  assert.equal(
    isTrustedRendererUrl?.(
      "http://127.0.0.1:4173/src/main.tsx",
      "http://127.0.0.1:4173",
    ),
    true,
  );
  assert.equal(isTrustedRendererUrl?.("https://attacker.example", "http://127.0.0.1:4173"), false);
});

test("opens only http and https URLs outside Electron", async () => {
  const { isSafeExternalUrl } = await loadPolicy();

  assert.equal(isSafeExternalUrl?.("https://example.com/docs"), true);
  assert.equal(isSafeExternalUrl?.("http://example.com"), true);
  assert.equal(isSafeExternalUrl?.("file:///C:/secrets.txt"), false);
  assert.equal(isSafeExternalUrl?.("javascript:alert(1)"), false);
});
