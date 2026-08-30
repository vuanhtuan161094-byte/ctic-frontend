import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const internal = read('app/components/GovernanceCasesScreen.tsx');
const portal = read('app/components/CustomerCasesScreen.tsx');
const shell = read('app/components/DashboardShell.tsx');

test('internal workspace uses one shared shell while preserving four domain tabs', () => {
  assert.match(internal, /Thay đổi & Case/);
  for (const domain of ['changes', 'special-audits', 'complaints', 'appeals']) {
    assert.match(internal, new RegExp(domain));
  }
  assert.match(internal, /Yêu cầu thay đổi/);
  assert.match(internal, /Đánh giá đặc biệt/);
  assert.match(internal, /Khiếu nại/);
  assert.match(internal, /Kháng nghị/);
});

test('internal case lists include filters, owner, due date, status, detail and history', () => {
  assert.match(internal, /Tìm số case hoặc nội dung/);
  assert.match(internal, /Owner/);
  assert.match(internal, /Due date/);
  assert.match(internal, /Trạng thái/);
  assert.match(internal, /Lịch sử audit_log/);
  assert.match(internal, /\/history/);
});

test('change impact and special audit actions call dedicated endpoints', () => {
  assert.match(internal, /changes\/\$\{id\}\/assessment/);
  assert.match(internal, /special-audits\/\$\{id\}\/plan/);
  assert.match(internal, /special-audits\/\$\{id\}\/result/);
  assert.match(internal, /SPECIAL_AUDIT_REQUIRED/);
  assert.match(internal, /manday_recalculation_required/);
  assert.match(internal, /competency_change_required/);
});

test('complaint and appeal UI exposes assignment SoD and separate decision actions', () => {
  assert.match(internal, /complaints\/\$\{id\}\/assign/);
  assert.match(internal, /complaints\/\$\{id\}\/investigation/);
  assert.match(internal, /complaints\/\$\{id\}\/close/);
  assert.match(internal, /appeals\/\$\{id\}\/assign/);
  assert.match(internal, /appeals\/\$\{id\}\/review/);
  assert.match(internal, /appeals\/\$\{id\}\/decision/);
  assert.match(internal, /Independent decision owner UUID/);
});

test('customer workspace consumes only customer-safe case projections', () => {
  assert.match(portal, /\/customer-portal\/me\/cases\/\$\{domain\}/);
  assert.match(portal, /\/customer-portal\/me\/cases\/complaints/);
  assert.match(portal, /\/customer-portal\/me\/cases\/appeals/);
  assert.doesNotMatch(portal, /\/governance-cases\//);
  assert.doesNotMatch(portal, /internal_deliberation/);
  assert.doesNotMatch(portal, /independence_note/);
  assert.doesNotMatch(portal, /investigator_id/);
});

test('customer evidence upload and download use dedicated secure routes', () => {
  assert.match(portal, /document-files\/customer\/cases/);
  assert.match(portal, /document-files\/customer\/\$\{file\.id\}\/download/);
  assert.match(portal, /multipart\/form-data/);
  assert.match(portal, /Đã xác minh SHA-256/);
  assert.doesNotMatch(portal, /file_url/);
});

test('portal renders final status and response without private staff deliberation', () => {
  assert.match(portal, /final_response/);
  assert.match(portal, /assessment_outcome/);
  assert.match(portal, /challenged_decision/);
  assert.match(portal, /Các ghi chú điều tra, deliberation và SoD nội bộ không được hiển thị/);
});

test('role-aware navigation exposes the appropriate internal or customer case workspace', () => {
  assert.match(shell, /GovernanceCasesScreen/);
  assert.match(shell, /CustomerCasesScreen/);
  assert.match(shell, /activeView === "governance-cases" && customerPortalMode/);
  assert.match(shell, /Thay đổi & Case/);
  assert.match(shell, /Thay đổi & phản hồi/);
});
