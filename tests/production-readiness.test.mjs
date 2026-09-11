import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vite = fs.readFileSync(new URL('../vite.ctic.config.ts', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8');
const deployment = fs.readFileSync(new URL('../app/lib/deployment-config.ts', import.meta.url), 'utf8');
const application = fs.readFileSync(new URL('../app/components/CticApplication.tsx', import.meta.url), 'utf8');
const loginRuntime = fs.readFileSync(new URL('../app/components/LoginRuntime.tsx', import.meta.url), 'utf8');
const authenticatedRuntime = fs.readFileSync(new URL('../app/components/AuthenticatedRuntime.tsx', import.meta.url), 'utf8');
const uiRuntime = fs.readFileSync(new URL('../app/components/UiRuntime.tsx', import.meta.url), 'utf8');
const queryRuntime = fs.readFileSync(new URL('../app/components/QueryRuntime.tsx', import.meta.url), 'utf8');
const dashboardShell = fs.readFileSync(new URL('../app/components/DashboardShell.tsx', import.meta.url), 'utf8');
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

test('bootstrap defers login, UI framework and authenticated runtime until after session restore', () => {
  assert.match(application, /const LoginRuntime = lazy\(\(\) =>/);
  assert.match(application, /import\("\.\/LoginRuntime"\)/);
  assert.doesNotMatch(application, /import\("\.\/LoginScreen"\)/);
  assert.match(application, /Đang tải đăng nhập/);
  assert.match(application, /const AuthenticatedRuntime = lazy\(\(\) =>/);
  assert.match(application, /import\("\.\/AuthenticatedRuntime"\)/);
  assert.doesNotMatch(application, /from "antd"/);
  assert.doesNotMatch(application, /antd\/locale/);
  assert.doesNotMatch(application, /from "dayjs"/);
  assert.doesNotMatch(application, /@tanstack\/react-query/);
  assert.doesNotMatch(application, /QueryClientProvider|ConfigProvider|AntdApp/);
  assert.match(loginRuntime, /<UiRuntime>/);
  assert.match(loginRuntime, /<LoginScreen onLogin=\{onLogin\} \/>/);
  assert.match(authenticatedRuntime, /<UiRuntime>/);
  assert.match(authenticatedRuntime, /<QueryRuntime>/);
  assert.match(authenticatedRuntime, /<DashboardShell session=\{session\} onLogout=\{onLogout\} \/>/);
  assert.match(uiRuntime, /ConfigProvider/);
  assert.match(uiRuntime, /<AntdApp>\{children\}<\/AntdApp>/);
  assert.match(uiRuntime, /viVN/);
  assert.match(uiRuntime, /dayjs\.locale\("vi"\)/);
  assert.match(queryRuntime, /new QueryClient\(/);
  assert.match(queryRuntime, /<QueryClientProvider client=\{queryClient\}>/);
  assert.match(application, /Đang tải không gian làm việc/);
});

test('DEV isolated workspaces retain on-demand UI and query providers', () => {
  assert.match(application, /const DevQueryRuntime = import\.meta\.env\.DEV/);
  assert.match(application, /const DevUiRuntime = import\.meta\.env\.DEV/);
  assert.match(application, /function DevQueryBoundary/);
  assert.match(application, /function DevUiBoundary/);
  assert.match(application, /<DevUiBoundary><DevCertificationCaseVisualShowcase \/><\/DevUiBoundary>/);
  for (const workspace of [
    'DevCertificateWorkspace',
    'DevDecisionWorkspace',
    'DevTechnicalReviewWorkspace',
    'DevCapWorkspace',
  ]) {
    assert.match(application, new RegExp(`<DevUiBoundary><DevQueryBoundary><${workspace} \\/><\\/DevQueryBoundary><\\/DevUiBoundary>`));
  }
});

test('all route-level screens are lazy behind the persistent app shell', () => {
  assert.match(dashboardShell, /import \{ lazy, Suspense,/);
  for (const screen of [
    'CertificationProjectDetailScreen',
    'CertificationProjectsScreen',
    'ExpertsScreen',
    'ScheduleResourcesScreen',
    'CertificationCaseRegistryPage',
    'CertificationCaseWorkspace',
    'CertificationAuditWorkspace',
    'CertificationCapWorkspace',
    'CertificationTechnicalReviewWorkspace',
    'CertificationDecisionWorkspace',
    'CertificationCertificateWorkspace',
    'CertificatesScreen',
    'CustomersScreen',
    'CustomerCorrectiveActionsScreen',
    'CustomerPortalDashboardScreen',
    'CustomerProfileScreen',
    'CustomerApplicationsScreen',
    'CustomerAuditScheduleScreen',
    'CustomerResultNotificationsScreen',
    'CustomerCertificatesScreen',
    'CustomerCertificationsScreen',
    'CustomerChangeRequestsScreen',
    'CustomerPortalUsersScreen',
    'CustomerUserRequestsScreen',
    'CustomerDocumentsScreen',
    'CustomerDocumentRequestsScreen',
    'DocumentsScreen',
    'GovernanceCasesScreen',
    'CustomerCasesScreen',
    'MyTasksScreen',
    'MyCalendarScreen',
    'NotificationsScreen',
    'PersonalDashboardScreen',
    'ManagementCockpitScreen',
    'SystemAdminScreen',
    'DelegationScreen',
    'ConfigurationRouteScreen',
    'AccountAccessDetailScreen',
    'RolesPermissionsScreen',
  ]) {
    assert.match(dashboardShell, new RegExp(`const ${screen} = lazy\\(\\(\\) =>`));
  }
  assert.match(dashboardShell, /<Suspense fallback=\{<LoadingSkeleton variant="detail" rows=\{10\} \/>\}>/);
  assert.match(dashboardShell, /import \{ NotificationCenter \} from "\.\/NotificationCenter"/);
});

test('authenticated runtime production chunk stays below 500 kB', () => {
  const assetsDir = new URL('../dist/assets/', import.meta.url);
  const runtimeAsset = fs.readdirSync(assetsDir).find((name) => /^AuthenticatedRuntime-.*\.js$/.test(name));
  assert.ok(runtimeAsset, 'AuthenticatedRuntime production chunk was not emitted');
  const bytes = fs.statSync(new URL(runtimeAsset, assetsDir)).size;
  assert.ok(bytes < 500 * 1024, `AuthenticatedRuntime chunk is ${bytes} bytes; expected < 512000`);
});

test('frontend lint gate rejects warnings instead of accumulating debt', () => {
  assert.match(packageJson.scripts.lint, /--max-warnings=0/);
});

test('IMS reduction validation uses the dedicated integration reduction value', () => {
  assert.match(projectsScreen, /if \(integrationReductionPercent > 20\)/);
  assert.doesNotMatch(projectsScreen, /adjustmentTotals\.imsReduction/);
});