import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vite = fs.readFileSync(new URL('../vite.ctic.config.ts', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8');
const deployment = fs.readFileSync(new URL('../app/lib/deployment-config.ts', import.meta.url), 'utf8');
const application = fs.readFileSync(new URL('../app/components/CticApplication.tsx', import.meta.url), 'utf8');
const projectsScreen = fs.readFileSync(new URL('../app/components/CertificationProjectsScreen.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('production build has an explicit deployment target guard', () => {
  assert.match(vite, /VITE_DEPLOYMENT_TARGET/);
  assert.match(vite, /localhost/);
});

test('production source maps are disabled', () => {
  assert.match(vite, /sourcemap:\s*false/);
});

test('production example prefers same-origin without localhost values', () => {
  assert.match(env, /VITE_DEPLOYMENT_TARGET=production/);
  assert.match(env, /VITE_API_BASE_URL=\s*$/m);
  assert.match(env, /VITE_PUBLIC_API_BASE_URL=\s*$/m);
});

test('runtime browser helper still supports same-origin reverse-proxy deployment', () => {
  assert.match(deployment, /same-origin/);
  assert.match(deployment, /window\.location/);
});

test('authenticated dashboard shell is split from the login startup path', () => {
  assert.match(application, /const DashboardShell = lazy\(\(\) =>/);
  assert.match(application, /import\("\.\/DashboardShell"\)/);
  assert.doesNotMatch(application, /import \{ DashboardShell \} from "\.\/DashboardShell"/);
  assert.match(application, /Đang tải không gian làm việc/);
});

test('frontend lint gate rejects warnings instead of accumulating debt', () => {
  assert.match(packageJson.scripts.lint, /--max-warnings=0/);
});

test('IMS reduction validation uses the dedicated integration reduction value', () => {
  assert.match(projectsScreen, /if \(integrationReductionPercent > 20\)/);
  assert.doesNotMatch(projectsScreen, /adjustmentTotals\.imsReduction/);
});
