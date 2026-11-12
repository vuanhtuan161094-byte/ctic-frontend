import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/components/design-system/enterprise-polish-v9.css", import.meta.url), "utf8");
const management = await readFile(new URL("../app/components/ManagementCockpitScreen.tsx", import.meta.url), "utf8");

test("V9 enterprise polish loads after the canonical stylesheet", () => {
  const base = main.indexOf('import "../app/globals.css";');
  const polish = main.indexOf('import "../app/components/design-system/enterprise-polish-v9.css";');
  assert.ok(base >= 0 && polish > base, "polish stylesheet must come after existing CMP styles");
});

test("V9 styles remain scoped to CMP application and personal dashboard", () => {
  assert.match(css, /\.application-shell \.top-header-v2/);
  assert.match(css, /\.application-shell \.desktop-sider/);
  assert.match(css, /\.personal-dashboard \.personal-kpi-card/);
  assert.match(css, /\.application-content :is\(/);
  assert.doesNotMatch(css, /(^|\n)\s*(?:body|html|:root)\s*\{/);
});

test("V9 has accessible focus and explicit reduced-motion behavior", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /transform: none/);
});

test("V9 motion has no perpetual or heavyweight effects", () => {
  assert.doesNotMatch(css, /\binfinite\b|backdrop-filter|url\(https?:|@font-face/);
  assert.match(css, /cmp-v9-card-reveal 240ms/);
});

test("management screen uses plain Vietnamese operational terminology", () => {
  assert.match(management, /Tổng quan điều hành/);
  assert.match(management, /Đã lưu báo giá nháp/);
  assert.match(management, /Đã tạo mốc thanh toán/);
  assert.match(management, /Chương trình chứng nhận/);
  assert.doesNotMatch(management, /Buồng lái quản trị|Đã tạo báo giá DRAFT\.|Đã tạo billing milestone\.|Không thể tải cockpit/);
});
