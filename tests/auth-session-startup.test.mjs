import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const applicationUrl = new URL("../app/components/CticApplication.tsx", import.meta.url);

test("auth startup restores or rejects stored sessions before exposing the application", async () => {
  const source = await readFile(applicationUrl, "utf8");

  assert.match(source, /queueMicrotask\(\(\) =>/);
  assert.match(source, /window\.sessionStorage\.getItem\(SESSION_STORAGE_KEY\)/);
  assert.match(source, /setSession\(JSON\.parse\(rawSession\) as AuthSession\)/);
  assert.match(source, /catch \{[\s\S]*window\.sessionStorage\.removeItem\(SESSION_STORAGE_KEY\)/);
  assert.match(source, /setSessionReady\(true\)/);
  assert.match(source, /if \(!sessionReady\)[\s\S]*app-loading/);
  assert.match(source, /window\.addEventListener\("ctic:unauthorized"/);
  assert.match(source, /handleLogin[\s\S]*sessionStorage\.setItem/);
  assert.match(source, /handleLogout[\s\S]*sessionStorage\.removeItem/);
});
