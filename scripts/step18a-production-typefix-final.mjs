import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function replaceExact(relativePath, from, to, expectedCount = 1) {
  const source = read(relativePath);
  const count = source.split(from).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${relativePath}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  write(relativePath, source.replaceAll(from, to));
  console.log(`updated ${relativePath}: ${count} replacement(s)`);
}

// Exact resource model allows legacy plan codes that were never assigned.
replaceExact(
  "app/components/CertificationProjectDetailScreen.tsx",
  "  plan_codes?: Array<string | null>;",
  "  plan_codes?: Array<string | null | undefined>;",
);

// Structured JSON factors intentionally permit arbitrary source keys; retain that shape after adding display metadata.
replaceExact(
  "app/components/CertificationProjectDetailScreen.tsx",
  '                  ...reviewIncreaseFactors.map((item) => ({ ...item, _type: "Tăng" })),',
  '                  ...reviewIncreaseFactors.map((item) => ({ ...item, _type: "Tăng" } as Record<string, unknown> & { _type: string })),',
);
replaceExact(
  "app/components/CertificationProjectDetailScreen.tsx",
  '                  ...reviewReductionFactors.map((item) => ({ ...item, _type: "Giảm" })),',
  '                  ...reviewReductionFactors.map((item) => ({ ...item, _type: "Giảm" } as Record<string, unknown> & { _type: string })),',
);

// IMS reduction is a separate authoritative value, not part of manual MD5 adjustment totals.
replaceExact(
  "app/components/CertificationProjectsScreen.tsx",
  "      if (adjustmentTotals.imsReduction > 20) {",
  "      if (integrationReductionPercent > 20) {",
);

// Dynamic table column must retain the row type when conditionally spread into the column array.
replaceExact(
  "app/components/ExpertResourceGovernancePanel.tsx",
  '      title: "Review / mitigation",\n      width: 280,\n      render: (_, row) => (',
  '      title: "Review / mitigation",\n      width: 280,\n      render: (_: unknown, row: IndependenceConflict) => (',
);

// NACE/IAF rows legitimately contain either a mapped IAF object or null.
{
  const relativePath = "app/components/IndustryTaxonomyPanel.tsx";
  let source = read(relativePath);
  const marker = "type MappingCoverage = {";
  if ((source.split(marker).length - 1) !== 1) throw new Error(`${relativePath}: MappingCoverage marker mismatch`);
  source = source.replace(marker, `type ResolvedDemoRow = {\n  key: string;\n  isic: IndustryCode;\n  nace: IndustryCode;\n  mappingType: string;\n  iaf: ResolveResult["nace_candidates"][number]["iaf_candidates"][number] | null;\n};\n\n${marker}`);

  const flatMapFrom = "    return codes.flatMap((row) => {";
  if ((source.split(flatMapFrom).length - 1) !== 1) throw new Error(`${relativePath}: NACE/IAF flatMap marker mismatch`);
  source = source.replace(flatMapFrom, "    return codes.flatMap<NaceIafDisplayRow>((row) => {");

  const resolvedFrom = "  const resolvedRows = demoResults.flatMap((result) => result.nace_candidates.flatMap((candidate) => {";
  if ((source.split(resolvedFrom).length - 1) !== 1) throw new Error(`${relativePath}: resolvedRows marker mismatch`);
  source = source.replace(
    resolvedFrom,
    "  const resolvedRows: ResolvedDemoRow[] = demoResults.flatMap((result) => result.nace_candidates.flatMap<ResolvedDemoRow>((candidate) => {",
  );

  const tableFrom = "        {resolvedRows.length ? (\n          <Table\n";
  if ((source.split(tableFrom).length - 1) !== 1) throw new Error(`${relativePath}: resolved table marker mismatch`);
  source = source.replace(tableFrom, "        {resolvedRows.length ? (\n          <Table<ResolvedDemoRow>\n");
  write(relativePath, source);
  console.log(`updated ${relativePath}: explicit display row unions`);
}

// AntD cellRender permits a wider date-like value than RangePicker's model; normalize via dayjs.
{
  const relativePath = "app/components/ScheduleResourcesScreen.tsx";
  let source = read(relativePath);
  const currentFormat = 'const key = current.format("YYYY-MM-DD");';
  const formatCount = source.split(currentFormat).length - 1;
  if (formatCount < 1) throw new Error(`${relativePath}: no calendar current.format marker found`);
  source = source.replaceAll(currentFormat, 'const key = dayjs(current).format("YYYY-MM-DD");');

  const localeLine = "          locale={viVN.Calendar}\n";
  if ((source.split(localeLine).length - 1) !== 1) throw new Error(`${relativePath}: Calendar locale marker mismatch`);
  source = source.replace(localeLine, "");
  write(relativePath, source);
  console.log(`updated ${relativePath}: ${formatCount} date normalization(s), ConfigProvider owns locale`);
}

console.log("Final production type-fix migration applied successfully.");
