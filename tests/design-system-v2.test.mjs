import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("DomainStatusBadge requires a domain and resolves status within that domain", async () => {
  const [status, types] = await Promise.all([
    read("app/components/design-system/status.tsx"),
    read("app/components/design-system/types.ts"),
  ]);

  assert.match(status, /interface DomainStatusBadgeProps \{[\s\S]*domain: StatusDomain;[\s\S]*code: string;/);
  assert.match(status, /DOMAIN_STATUS_VOCABULARY\[domain\]\[code\]/);
  assert.match(status, /applicationReview:[\s\S]*APPROVED: definition\("Đã phê duyệt", "positive"\)/);
  assert.match(status, /quotation:[\s\S]*APPROVED: definition\("Đã duyệt", "positive"\)/);
  assert.match(types, /export type StatusDomain =/);
  assert.doesNotMatch(status, /const\s+APPROVED\s*=/);
});

test("DeadlineSlaBadge exposes exactly five states and treats a missing applicable deadline as NOT_CONFIGURED", async () => {
  const source = await read("app/components/design-system/status.tsx");
  const union = source.match(/export type DeadlineSlaState = ([^;]+);/)?.[1] ?? "";

  assert.deepEqual(
    [...union.matchAll(/"([A-Z_]+)"/g)].map((match) => match[1]),
    ["NOT_APPLICABLE", "NOT_CONFIGURED", "ON_TRACK", "DUE_SOON", "OVERDUE"],
  );
  assert.match(source, /state !== "NOT_APPLICABLE" && !dueAt \? "NOT_CONFIGURED" : state/);
  assert.doesNotMatch(source, /Date\.now|new Date|getTime\(/);
});

test("responsibility cards use the four frozen Vietnamese responsibility variants", async () => {
  const source = await read("app/components/design-system/layout.tsx");
  for (const label of ["Việc của tôi", "Đang chờ người khác xử lý", "Được ủy quyền cho tôi", "Tôi đã bàn giao"]) {
    assert.ok(source.includes(label), `missing responsibility label: ${label}`);
  }
  assert.match(source, /type ResponsibilityState = "OWN" \| "WAITING" \| "DELEGATED_TO_ME" \| "HANDED_OFF"/);
});

test("page and next-action APIs allow at most one explicit primary action", async () => {
  const [layout, workflow] = await Promise.all([
    read("app/components/design-system/layout.tsx"),
    read("app/components/design-system/workflow.tsx"),
  ]);
  assert.match(layout, /primaryAction\?: ReactNode;/);
  assert.match(layout, /secondaryActions\?: ReactNode;/);
  assert.match(workflow, /primaryAction\?: ProjectedAction \| null;/);
  assert.doesNotMatch(workflow, /primaryActions/);
  assert.match(workflow, /<ActionButton action=\{primaryAction\} primary \/>/);
});

test("ForbiddenState is non-disclosing and cannot receive entity content", async () => {
  const source = await read("app/components/design-system/states.tsx");
  const forbidden = source.slice(source.indexOf("export function ForbiddenState"), source.indexOf("export function ReadOnlyState"));
  assert.match(forbidden, /\{ exit \}: \{ exit\?: StateAction \}/);
  assert.match(forbidden, /Bạn không có quyền xem nội dung này/);
  assert.doesNotMatch(forbidden, /children|entity|customer|caseId|description\?:/i);
});

test("DataTable has an explicit responsive card-list fallback contract", async () => {
  const [source, css] = await Promise.all([
    read("app/components/design-system/data-display.tsx"),
    read("app/components/design-system/tokens.css"),
  ]);
  assert.match(source, /responsiveCards\?: ResponsiveCardItem\[\]/);
  assert.match(source, /data-desktop-grid="antd-table"/);
  assert.match(source, /data-responsive-fallback="card-list"/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.cmp-data-table--responsive \{ display: none; \}[\s\S]*\.cmp-responsive-card-list \{ display: grid;/);
});

test("ConfirmDialog requires a reason for reason and destructive variants", async () => {
  const source = await read("app/components/design-system/overlays.tsx");
  assert.match(source, /variant === "reason" \|\| variant === "destructive"/);
  assert.match(source, /required: true, whitespace: true, message: "Vui lòng nhập lý do\."/);
  assert.match(source, /await form\.validateFields\(\)/);
});

test("design-system foundation is white-label and the showcase stays development-only", async () => {
  const directory = new URL("app/components/design-system/", root);
  const files = (await readdir(directory)).filter((file) => /\.(tsx|ts|css)$/.test(file));
  const sources = await Promise.all(files.map((file) => read(`app/components/design-system/${file}`)));
  const main = await read("src/main.tsx");
  const shell = await read("app/components/DashboardShell.tsx");

  assert.doesNotMatch(sources.join("\n"), /\bCTIC\b/i);
  assert.match(main, /import\.meta\.env\.DEV/);
  assert.match(main, /has\("design-system"\)/);
  assert.match(main, /const DevDesignSystemShowcase = import\.meta\.env\.DEV[\s\S]*lazy\(\(\) =>[\s\S]*import\("\.\.\/app\/components\/design-system\/DesignSystemShowcase"\)/);
  assert.doesNotMatch(main, /import \{ DesignSystemShowcase \} from/);
  assert.doesNotMatch(shell, /DesignSystemShowcase/);
  assert.match(shell, /from "\.\/design-system"/);
});
