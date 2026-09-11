import fs from "node:fs";

const shellPath = "app/components/DashboardShell.tsx";
const testPath = "tests/production-readiness.test.mjs";
let shell = fs.readFileSync(shellPath, "utf8");
let test = fs.readFileSync(testPath, "utf8");

const staticImports = [
  'import { CertificationCaseRegistryPage, CertificationCaseWorkspace } from "./certification-case";\n',
  'import {\n  CertificationAuditWorkspace,\n  type CertificationAuditExecutionView,\n  type CertificationAuditSection,\n} from "./certification-audit";\n',
  'import { CertificationCapWorkspace } from "./certification-cap/CertificationCapWorkspace";\n',
  'import { CertificationTechnicalReviewWorkspace } from "./certification-review/CertificationTechnicalReviewWorkspace";\n',
  'import { CertificationDecisionWorkspace } from "./certification-decision/CertificationDecisionWorkspace";\n',
  'import { CertificationCertificateWorkspace } from "./certificate-workspace/CertificationCertificateWorkspace";\n',
  'import { CertificatesScreen } from "./CertificatesScreen";\n',
  'import { CustomersScreen } from "./CustomersScreen";\n',
  'import { CustomerCorrectiveActionsScreen } from "./CustomerCorrectiveActionsScreen";\n',
  'import { CustomerPortalDashboardScreen } from "./CustomerPortalDashboardScreen";\n',
  'import { CustomerProfileScreen } from "./CustomerProfileScreen";\n',
  'import { CustomerApplicationsScreen } from "./CustomerApplicationsScreen";\n',
  'import { CustomerAuditScheduleScreen } from "./CustomerAuditScheduleScreen";\n',
  'import { CustomerResultNotificationsScreen } from "./CustomerResultNotificationsScreen";\n',
  'import { CustomerCertificatesScreen } from "./CustomerCertificatesScreen";\n',
  'import { CustomerCertificationsScreen } from "./CustomerCertificationsScreen";\n',
  'import { CustomerChangeRequestsScreen } from "./CustomerChangeRequestsScreen";\n',
  'import { CustomerPortalUsersScreen } from "./CustomerPortalUsersScreen";\n',
  'import { CustomerUserRequestsScreen } from "./CustomerUserRequestsScreen";\n',
  'import { CustomerDocumentsScreen } from "./CustomerDocumentsScreen";\n',
  'import { CustomerDocumentRequestsScreen } from "./CustomerDocumentRequestsScreen";\n',
  'import { DocumentsScreen } from "./DocumentsScreen";\n',
  'import { GovernanceCasesScreen } from "./GovernanceCasesScreen";\n',
  'import { CustomerCasesScreen } from "./CustomerCasesScreen";\n',
  'import { MyTasksScreen } from "./MyTasksScreen";\n',
  'import { MyCalendarScreen } from "./MyCalendarScreen";\n',
  'import { NotificationsScreen } from "./NotificationsScreen";\n',
  'import { PersonalDashboardScreen } from "./PersonalDashboardScreen";\n',
  'import { ManagementCockpitScreen } from "./ManagementCockpitScreen";\n',
  'import { SystemAdminScreen } from "./SystemAdminScreen";\n',
  'import { DelegationScreen } from "./DelegationScreen";\n',
  'import { ConfigurationRouteScreen, type ConfigurationRouteSection } from "./ConfigurationRouteScreen";\n',
  'import { AccountAccessDetailScreen, type AccountDetailSection } from "./AccountAccessDetailScreen";\n',
  'import { RolesPermissionsScreen } from "./RolesPermissionsScreen";\n',
];

for (const entry of staticImports) {
  if (!shell.includes(entry)) throw new Error(`Expected static route import missing: ${entry.trim()}`);
  shell = shell.replace(entry, "");
}

const typeAnchor = 'import type { PersonalWorkspace } from "../types/personal-workspace";\n';
if (!shell.includes(typeAnchor)) throw new Error("PersonalWorkspace import anchor missing");
if (!shell.includes('import type { CapSection } from "./certification-cap/cap-model";')) {
  throw new Error("Existing CAP section type import missing; abort route split");
}
const typeImports = `${typeAnchor}import type { CertificationAuditExecutionView, CertificationAuditSection } from "./certification-audit/CertificationAuditWorkspace";\nimport type { ConfigurationRouteSection } from "./ConfigurationRouteScreen";\nimport type { AccountDetailSection } from "./AccountAccessDetailScreen";\n`;
shell = shell.replace(typeAnchor, typeImports);

const lazyStart = 'const CertificationProjectDetailScreen = lazy(() =>\n';
const lazyEnd = '\nconst { Header, Content, Sider } = Layout;';
const startIndex = shell.indexOf(lazyStart);
const endIndex = shell.indexOf(lazyEnd);
if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) throw new Error("Existing lazy route block boundary missing");

const routeComponents = [
  ["CertificationProjectDetailScreen", "./CertificationProjectDetailScreen"],
  ["CertificationProjectsScreen", "./CertificationProjectsScreen"],
  ["ExpertsScreen", "./ExpertsScreen"],
  ["ScheduleResourcesScreen", "./ScheduleResourcesScreen"],
  ["CertificationCaseRegistryPage", "./certification-case/CertificationCaseRegistryPage"],
  ["CertificationCaseWorkspace", "./certification-case/CertificationCaseWorkspace"],
  ["CertificationAuditWorkspace", "./certification-audit/CertificationAuditWorkspace"],
  ["CertificationCapWorkspace", "./certification-cap/CertificationCapWorkspace"],
  ["CertificationTechnicalReviewWorkspace", "./certification-review/CertificationTechnicalReviewWorkspace"],
  ["CertificationDecisionWorkspace", "./certification-decision/CertificationDecisionWorkspace"],
  ["CertificationCertificateWorkspace", "./certificate-workspace/CertificationCertificateWorkspace"],
  ["CertificatesScreen", "./CertificatesScreen"],
  ["CustomersScreen", "./CustomersScreen"],
  ["CustomerCorrectiveActionsScreen", "./CustomerCorrectiveActionsScreen"],
  ["CustomerPortalDashboardScreen", "./CustomerPortalDashboardScreen"],
  ["CustomerProfileScreen", "./CustomerProfileScreen"],
  ["CustomerApplicationsScreen", "./CustomerApplicationsScreen"],
  ["CustomerAuditScheduleScreen", "./CustomerAuditScheduleScreen"],
  ["CustomerResultNotificationsScreen", "./CustomerResultNotificationsScreen"],
  ["CustomerCertificatesScreen", "./CustomerCertificatesScreen"],
  ["CustomerCertificationsScreen", "./CustomerCertificationsScreen"],
  ["CustomerChangeRequestsScreen", "./CustomerChangeRequestsScreen"],
  ["CustomerPortalUsersScreen", "./CustomerPortalUsersScreen"],
  ["CustomerUserRequestsScreen", "./CustomerUserRequestsScreen"],
  ["CustomerDocumentsScreen", "./CustomerDocumentsScreen"],
  ["CustomerDocumentRequestsScreen", "./CustomerDocumentRequestsScreen"],
  ["DocumentsScreen", "./DocumentsScreen"],
  ["GovernanceCasesScreen", "./GovernanceCasesScreen"],
  ["CustomerCasesScreen", "./CustomerCasesScreen"],
  ["MyTasksScreen", "./MyTasksScreen"],
  ["MyCalendarScreen", "./MyCalendarScreen"],
  ["NotificationsScreen", "./NotificationsScreen"],
  ["PersonalDashboardScreen", "./PersonalDashboardScreen"],
  ["ManagementCockpitScreen", "./ManagementCockpitScreen"],
  ["SystemAdminScreen", "./SystemAdminScreen"],
  ["DelegationScreen", "./DelegationScreen"],
  ["ConfigurationRouteScreen", "./ConfigurationRouteScreen"],
  ["AccountAccessDetailScreen", "./AccountAccessDetailScreen"],
  ["RolesPermissionsScreen", "./RolesPermissionsScreen"],
];

const lazyBlock = routeComponents.map(([name, modulePath]) =>
  `const ${name} = lazy(() =>\n  import("${modulePath}").then((module) => ({ default: module.${name} })),\n);`
).join("\n");

shell = `${shell.slice(0, startIndex)}${lazyBlock}${shell.slice(endIndex)}`;

if (!shell.includes('import { NotificationCenter } from "./NotificationCenter";')) {
  throw new Error("Persistent NotificationCenter must remain eager");
}
for (const [name, modulePath] of routeComponents) {
  if (!shell.includes(`const ${name} = lazy(() =>`)) throw new Error(`Lazy declaration missing for ${name}`);
  if (!shell.includes(`import("${modulePath}")`)) throw new Error(`Dynamic import missing for ${name}`);
}

const oldRouteTest = `test('heavy operational screens are route-lazy behind the persistent app shell', () => {\n  assert.match(dashboardShell, /import \\{ lazy, Suspense,/);\n  for (const screen of [\n    'CertificationProjectDetailScreen',\n    'CertificationProjectsScreen',\n    'ExpertsScreen',\n    'ScheduleResourcesScreen',\n  ]) {\n    assert.match(dashboardShell, new RegExp(\`const \${screen} = lazy\\\\(\\\\(\\\\) =>\`));\n    assert.match(dashboardShell, new RegExp(\`import\\\\(\\\\\"\\\\.\\\\/\${screen}\\\\\"\\\\)\`));\n    assert.doesNotMatch(dashboardShell, new RegExp(\`import \\\\{ \${screen} \\\\} from \\\\"\\\\.\\\\/\${screen}\\\\\"\`));\n  }\n  assert.match(dashboardShell, /<Suspense fallback=\\{<LoadingSkeleton variant=\"detail\" rows=\\{10\\} \\/>\\}>/);\n});\n`;
if (!test.includes(oldRouteTest)) throw new Error("Existing route lazy regression test changed; aborting");

const routeNames = routeComponents.map(([name]) => `    '${name}',`).join("\n");
const newRouteTest = `test('all route-level screens are lazy behind the persistent app shell', () => {\n  assert.match(dashboardShell, /import \\{ lazy, Suspense,/);\n  for (const screen of [\n${routeNames}\n  ]) {\n    assert.match(dashboardShell, new RegExp(\`const \${screen} = lazy\\\\(\\\\(\\\\) =>\`));\n  }\n  assert.match(dashboardShell, /<Suspense fallback=\\{<LoadingSkeleton variant=\"detail\" rows=\\{10\\} \\/>\\}>/);\n  assert.match(dashboardShell, /import \\{ NotificationCenter \\} from \"\\.\\/NotificationCenter\"/);\n});\n\ntest('dashboard shell production chunk stays below 500 kB', () => {\n  const assetsDir = new URL('../dist/assets/', import.meta.url);\n  const shellAsset = fs.readdirSync(assetsDir).find((name) => /^DashboardShell-.*\\.js$/.test(name));\n  assert.ok(shellAsset, 'DashboardShell production chunk was not emitted');\n  const bytes = fs.statSync(new URL(shellAsset, assetsDir)).size;\n  assert.ok(bytes < 500 * 1024, \`DashboardShell chunk is \${bytes} bytes; expected < 512000\`);\n});\n`;
test = test.replace(oldRouteTest, newRouteTest);

fs.writeFileSync(shellPath, shell);
fs.writeFileSync(testPath, test);
console.log(`Step 18A route split prepared for ${routeComponents.length} route-level screens with a 500 kB shell budget.`);
