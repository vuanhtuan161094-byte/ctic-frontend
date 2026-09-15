import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../app/', import.meta.url);
const panel = await readFile(new URL('components/MasterDataConfigurationPanel.tsx', root), 'utf8');
const brandingSource = await readFile(new URL('lib/organization-branding.ts', root), 'utf8');
const compiled = ts.transpileModule(brandingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const branding = { exports: {} }; vm.runInNewContext(compiled, branding);
const fallback = { shortName: 'ENV', organizationName: 'Environment CB', platformName: 'Environment Portal' };
test('safe branding uses configured names/title and preserves environment fallback for missing values', () => {
  const resolve = branding.exports.resolveOrganizationBranding;
  const configured = resolve(fallback, { short_name: ' CB ', display_name: ' Our Company ', portal_title: ' Our Portal ', file_retention_days: 999 });
  assert.equal(configured.shortName, 'CB'); assert.equal(configured.organizationName, 'Our Company'); assert.equal(configured.platformName, 'Our Portal');
  assert.equal(configured.file_retention_days, undefined);
  assert.equal(JSON.stringify(resolve(fallback)), JSON.stringify(fallback));
  assert.equal(JSON.stringify(resolve(fallback, { short_name: ' ', display_name: null, portal_title: '' })), JSON.stringify(fallback));
});
function form() {
  const start = panel.indexOf('<Form form={profileForm}');
  const end = panel.indexOf('</Form>', start) + '</Form>'.length;
  assert.ok(start > 0 && end > start);
  const source = `function render(){return (${panel.slice(start, end)});} result = render();`;
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), Fragment: 'Fragment' },
    Form: Object.assign(() => {}, { Item: 'Form.Item' }), Input: Object.assign(() => {}, { TextArea: 'TextArea' }),
    Alert: 'Alert', Card: 'Card', Collapse: 'Collapse', InputNumber: 'InputNumber', Button: 'Button', profileForm: {}, saveProfile: { isPending: false, mutate() {} },
    readiness: { data: { organization: { ready: false, reasons: [{ code: 'ORGANIZATION_TIMEZONE_INVALID', field: 'timezone', message: 'Invalid IANA timezone' }], field_manifest: [{ field: 'file_retention_days', status: 'COMPATIBILITY_ONLY', effect: 'Not enforced' }] } } },
  };
  vm.runInNewContext(code, context);
  const nodes = []; const walk = value => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') { nodes.push(value); Object.values(value).forEach(walk); } }; walk(context.result);
  return nodes;
}
test('rendered organization form only exposes active settings', () => {
  const fields = form().filter(node => node.type === 'Form.Item').map(node => node.props.name);
  for (const field of ['legal_name', 'display_name', 'short_name', 'portal_title', 'timezone', 'certificate_reminder_days']) assert.ok(fields.includes(field), field);
  for (const field of ['logo_reference', 'document_footer', 'file_retention_days', 'locale', 'date_format', 'default_language']) assert.ok(!fields.includes(field), field);
});
test('rendered form explains compatibility retention and displays backend readiness reasons', () => {
  const content = JSON.stringify(form());
  assert.match(content, /Invalid IANA timezone/); assert.match(content, /chưa áp dụng bởi runtime/); assert.match(content, /Retention chưa có cơ chế thực thi/);
  assert.doesNotMatch(content, /branding\/logo-primary/);
});
test('portal and shell render safe runtime branding and save invalidates the cached projection', async () => {
  const portal = await readFile(new URL('components/CustomerPortalDashboardScreen.tsx', root), 'utf8');
  const shell = await readFile(new URL('components/DashboardShell.tsx', root), 'utf8');
  const hook = await readFile(new URL('lib/useOrganizationBranding.ts', root), 'utf8');
  assert.match(portal, /\{branding.platformName\}/); assert.match(shell, /\{branding.organizationName\}/); assert.match(shell, /\{branding.shortName\}/);
  assert.match(hook, /api.get<SafeOrganizationBranding>\('\/platform-branding'\)/);
  assert.match(panel, /invalidateQueries\(\{ queryKey: \["platform-branding"\]/);
});
test('production configuration surfaces do not instruct operators to execute local maintenance', async () => {
  const taxonomy = await readFile(new URL('components/IndustryTaxonomyPanel.tsx', root), 'utf8');
  const route = await readFile(new URL('components/ConfigurationRouteScreen.tsx', root), 'utf8');
  for (const source of [panel, taxonomy, route]) assert.doesNotMatch(source, /\.cmd\b|DEV[- ]loader|RESET_DEV|REPAIR_STEP|APPLY_STEP/i);
});
