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

function replaceDividerTitlePlacement(relativePath) {
  const source = read(relativePath);
  const from = '<Divider orientation="left"';
  const count = source.split(from).length - 1;
  if (!count) return;
  write(relativePath, source.replaceAll(from, '<Divider titlePlacement="start"'));
  console.log(`updated ${relativePath}: ${count} Divider title placement replacement(s)`);
}

for (const relativePath of [
  "app/components/AuditDocumentCenterModal.tsx",
  "app/components/CertificationProjectDetailScreen.tsx",
  "app/components/CertificationProjectsScreen.tsx",
  "app/components/ScheduleResourcesScreen.tsx",
]) {
  replaceDividerTitlePlacement(relativePath);
}

replaceExact(
  "app/lib/ooxml-preview.ts",
  '  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw" as any));',
  '  const copy = new Uint8Array(data.byteLength);\n  copy.set(data);\n  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw" as any));',
);

{
  const relativePath = "app/components/CertificationProjectsScreen.tsx";
  let source = read(relativePath);

  const valuesFrom = "const values = wizardForm.getFieldsValue(true);";
  const valuesCount = source.split(valuesFrom).length - 1;
  if (!valuesCount) throw new Error(`${relativePath}: no getFieldsValue(true) assignment found`);
  source = source.replaceAll(valuesFrom, "const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;");
  console.log(`updated ${relativePath}: ${valuesCount} typed form value assignment(s)`);

  const adjustmentGuard = '      if (adjustmentTotals.reduction > 30) {';
  if ((source.split(adjustmentGuard).length - 1) !== 1) {
    throw new Error(`${relativePath}: adjustment total guard mismatch`);
  }
  source = source.replace(
    adjustmentGuard,
    '      const adjustmentTotals = getCurrentManualAdjustmentTotals();\n      if (adjustmentTotals.reduction > 30) {',
  );

  const settledFrom = `      const rows = settled\n        .filter((result): result is PromiseFulfilledResult<IndustryResolutionRow> => result.status === "fulfilled")\n        .map((result) => result.value);`;
  const settledTo = `      const rows = settled.flatMap((result) =>\n        result.status === "fulfilled" ? [result.value] : [],\n      );`;
  if ((source.split(settledFrom).length - 1) !== 1) {
    throw new Error(`${relativePath}: settled result block mismatch`);
  }
  source = source.replace(settledFrom, settledTo);

  const legacyParseFrom = `  return value\n    .split(/\\r?\\n/)\n    .map((line) => line.trim())\n    .filter(Boolean)\n    .map((line) => {\n      const match = line.match(/^(.+?):\\s*([0-9]+(?:[.,][0-9]+)?)%\\s*-\\s*(.+)$/);\n      if (!match) return null;\n      return {\n        adjustment_type: fallbackType,\n        factor_code: match[1].trim(),\n        percentage: Number(match[2].replace(",", ".")),\n        reason: match[3].trim(),\n      } satisfies MandayAdjustmentForm;\n    })\n    .filter((item): item is MandayAdjustmentForm => item !== null);`;
  const legacyParseTo = `  return value\n    .split(/\\r?\\n/)\n    .map((line) => line.trim())\n    .filter(Boolean)\n    .flatMap((line): MandayAdjustmentForm[] => {\n      const match = line.match(/^(.+?):\\s*([0-9]+(?:[.,][0-9]+)?)%\\s*-\\s*(.+)$/);\n      if (!match) return [];\n      return [{\n        adjustment_type: fallbackType,\n        factor_code: match[1].trim(),\n        percentage: Number(match[2].replace(",", ".")),\n        reason: match[3].trim(),\n      }];\n    });`;
  if ((source.split(legacyParseFrom).length - 1) !== 1) {
    throw new Error(`${relativePath}: legacy manday parse block mismatch`);
  }
  source = source.replace(legacyParseFrom, legacyParseTo);

  write(relativePath, source);
}

console.log("Step 18A safe type fixes applied successfully.");
