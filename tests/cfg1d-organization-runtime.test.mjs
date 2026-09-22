import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../app/', import.meta.url);
const panel = await readFile(new URL('components/MasterDataConfigurationPanel.tsx', root), 'utf8');
const route = await readFile(new URL('components/ConfigurationRouteScreen.tsx', root), 'utf8');
const brandingSource = await readFile(new URL('lib/organization-branding.ts', root), 'utf8');
const compiled = ts.transpileModule(brandingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const branding = { exports: {} };
vm.runInNewContext(compiled, branding);

const fallback = { shortName: 'ENV', organizationName: 'Environment CB', platformName: 'Environment Portal' };

test('safe branding uses configured names/title and preserves environment fallback for missing values', () => {
  const resolve = branding.exports.resolveOrganizationBranding;
  const configured = resolve(fallback, { short_name: ' CB ', display_name: ' Our Company ', portal_title: ' Our Portal ', file_retention_days: 999 });
  assert.equal(configured.shortName, 'CB');
  assert.equal(configured.organizationName, 'Our Company');
  assert.equal(configured.platformName, 'Our Portal');
  assert.equal(configured.file_retention_days, undefined);
  assert.equal(JSON.stringify(resolve(fallback)), JSON.stringify(fallback));
  assert.equal(JSON.stringify(resolve(fallback, { short_name: ' ', display_name: null, portal_title: '' })), JSON.stringify(fallback));
});

test('organization form only exposes business-facing settings', () => {
  for (const field of ['legal_name', 'display_name', 'short_name', 'portal_title', 'email', 'phone', 'website', 'address', 'timezone', 'certificate_reminder_days']) {
    assert.match(panel, new RegExp('name="' + field + '"'), field);
  }
  for (const field of ['logo_reference', 'document_footer', 'file_retention_days', 'locale', 'date_format', 'default_language']) {
    assert.doesNotMatch(panel, new RegExp('Form\\.Item name="' + field + '"'), field);
  }
  assert.doesNotMatch(panel, /CMP V1 hiện cố định giao diện/);
  assert.doesNotMatch(panel, /chưa áp dụng bởi runtime/);
});

test('legacy Vietnam timezone aliases normalize to IANA while V1 locale stays internal', () => {
  assert.match(panel, /Asia\/Ho_Chi_Minh/);
  assert.match(panel, /\["Việt Nam", "Vietnam", "GMT\+7", "\+07:00"\]/);
  assert.match(panel, /locale: "vi-VN"/);
  assert.match(panel, /default_language: "vi"/);
  assert.match(panel, /date_format: values\.date_format \|\| "DD\/MM\/YYYY"/);
});

test('organization workspace owns readiness without a duplicate route banner', () => {
  assert.match(panel, /Cần hoàn tất hồ sơ tổ chức/);
  assert.match(panel, /organizationReasonLabels/);
  assert.match(route, /organizationOwnsReadiness/);
});

test('portal and shell render safe runtime branding and save invalidates the cached projection', async () => {
  const portal = await readFile(new URL('components/CustomerPortalDashboardScreen.tsx', root), 'utf8');
  const shell = await readFile(new URL('components/DashboardShell.tsx', root), 'utf8');
  const hook = await readFile(new URL('lib/useOrganizationBranding.ts', root), 'utf8');
  assert.match(portal, /\{branding\.platformName\}/);
  assert.match(shell, /\{branding\.organizationName\}/);
  assert.match(shell, /\{branding\.shortName\}/);
  assert.match(hook, /api.get<SafeOrganizationBranding>\('\/platform-branding'\)/);
  assert.match(panel, /invalidateQueries\(\{ queryKey: \["platform-branding"\]/);
});

test('production configuration surfaces do not instruct operators to execute local maintenance', async () => {
  const taxonomy = await readFile(new URL('components/IndustryTaxonomyPanel.tsx', root), 'utf8');
  for (const source of [panel, taxonomy, route]) assert.doesNotMatch(source, /\.cmd\b|DEV[- ]loader|RESET_DEV|REPAIR_STEP|APPLY_STEP/i);
});
