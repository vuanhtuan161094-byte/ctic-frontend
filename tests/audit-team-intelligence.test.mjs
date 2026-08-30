import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'app/components/ScheduleResourcesScreen.tsx'), 'utf8');

test('assignment workspace loads current server-derived Team Readiness', () => {
  assert.match(source, /audit-team-readiness/);
  assert.match(source, /\/audit-team-appointments\/\$\{selectedAppointment!\.id\}\/readiness/);
  assert.match(source, /staleTime: 0/);
});

test('Team Readiness panel explains ready and not-ready states', () => {
  assert.match(source, /Team Readiness/);
  assert.match(source, /Sẵn sàng ban hành/);
  assert.match(source, /Chưa sẵn sàng/);
  assert.match(source, /blocking_reason_count/);
});

test('coverage matrix renders covered partial and missing scope state', () => {
  assert.match(source, /coverage_matrix\.map/);
  assert.match(source, /row\.status === "COVERED"/);
  assert.match(source, /row\.status === "PARTIAL"/);
  assert.match(source, /IAF \{row\.iaf_code\} · NACE \{row\.nace_code\}/);
});

test('collective program and scope coverage summaries are visible', () => {
  assert.match(source, /covered_scopes/);
  assert.match(source, /required_scopes/);
  assert.match(source, /covered_programs/);
  assert.match(source, /required_programs/);
});

test('lead and technical-expertise status are projected without sensitive conflict records', () => {
  assert.match(source, /leader_qualified/);
  assert.match(source, /technical_expertise_required/);
  assert.match(source, /technical_expertise_covered/);
  assert.doesNotMatch(source, /readiness[^\n]{0,120}(description|review_note|mitigation_justification)/i);
});

test('manday readiness participates in the issue decision', () => {
  assert.match(source, /summary\.manday_balanced/);
  assert.match(source, /selectedAppointmentMandaysBalanced/);
  assert.match(source, /!teamReadinessQuery\.data\?\.ready_to_issue/);
});

test('issue blocker remains server-backed and refetchable', () => {
  assert.match(source, /teamReadinessQuery\.isLoading/);
  assert.match(source, /teamReadinessQuery\.isError/);
  assert.match(source, /teamReadinessQuery\.refetch/);
  assert.match(source, /server vẫn sẽ kiểm tra khi ban hành/);
});
