import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reviewWorkspace = readFileSync(new URL("../app/components/TechnicalReviewWorkspaceModal.tsx", import.meta.url), "utf8");
const delegationScreen = readFileSync(new URL("../app/components/DelegationScreen.tsx", import.meta.url), "utf8");
const myWork = readFileSync(new URL("../app/components/MyTasksScreen.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");

test("technical review workspace uses coordinator assignment and has no self-claim route", () => {
  assert.match(reviewWorkspace, /Phân công người thẩm xét/);
  assert.match(reviewWorkspace, /technical-reviews\/plan\/\$\{planId\}\/assign/);
  assert.match(reviewWorkspace, /technical-reviews\/\$\{review\.id\}\/reassign/);
  assert.doesNotMatch(reviewWorkspace, /\/ensure/);
  assert.doesNotMatch(reviewWorkspace, />\s*Bắt đầu thẩm xét\s*</);
});

test("reviewer candidate UI communicates eligibility and independence", () => {
  assert.match(reviewWorkspace, /Đủ điều kiện · Độc lập/);
  assert.match(reviewWorkspace, /Lý do phân công lại/);
  assert.match(reviewWorkspace, /Lý do ADMIN override/);
});

test("delegation management is bounded, revocable and has no impersonation control", () => {
  assert.match(delegationScreen, /effective_from/);
  assert.match(delegationScreen, /effective_to/);
  assert.match(delegationScreen, /action_codes/);
  assert.match(delegationScreen, /Thu hồi ủy quyền/);
  assert.doesNotMatch(delegationScreen, /impersonat/i);
});

test("My Work distinguishes direct and delegated obligations without cloning task records", () => {
  assert.match(myWork, /item\.is_delegated/);
  assert.match(myWork, /Xử lý thay cho/);
  assert.match(myWork, /Việc của tôi/);
});

test("delegation screen is available from the internal account menu", () => {
  assert.match(dashboard, /Ủy quyền công việc/);
  assert.match(dashboard, /<DelegationScreen roles=\{session\.user\.roles\}/);
});

test("admin delegation governance exposes server-side user, delegate, status and time filters", () => {
  assert.match(delegationScreen, /delegator_user_id/);
  assert.match(delegationScreen, /delegate_user_id/);
  assert.match(delegationScreen, /status: value/);
  assert.match(delegationScreen, /from: period/);
  assert.match(delegationScreen, /to: period/);
  assert.match(delegationScreen, /params: isAdmin \? governanceFilters/);
});
