# UX-I1 — Playwright + axe Browser QA Baseline

Status: **COMPLETE FOR REVIEW — PRODUCTION BASELINE RED**  
Baseline date: **2026-09-15**  
Branch: `feature/ux-fix-batch01`  
Frontend canonical entering UX-I1: `9d207c39236a052157fddc397b74f9243eff2426`  
UX-I1 tested code candidate: `0fb67d043a8e9d834a0d3403f2359d39e8e2b0c2`

## 1. Scope and guardrails

UX-I1 establishes browser-level regression evidence only. It does not redesign or repair production UI.

Guardrails preserved:

- no `app/**` or `src/**` production UI changes;
- no database/schema changes;
- root production dependency graph and root `package-lock.json` remain unchanged;
- browser tooling is isolated under `e2e/` with its own lockfile;
- controlled DEV fixtures are explicitly not SQL-backed UAT;
- known production accessibility/runtime findings are not suppressed or whitelisted to make CI green;
- UX-I2+, CFG-2, CFG-3 and Step18B remain blocked pending checkpoint review.

## 2. Browser QA implementation

Pinned browser dependencies:

- `@playwright/test@1.63.0`
- `@axe-core/playwright@4.13.0`

Required projects:

- Chromium desktop: `1440x900`
- Chromium mobile: `390x844`

Root commands:

```text
npm run test:browser:setup
npm run test:browser
npm run test:browser:configuration
npm run test:browser:headed
```

The harness checks:

- selected route/view loads;
- `console.error`;
- uncaught `pageerror`;
- failed network requests;
- HTTP 5xx responses;
- horizontal page overflow;
- deterministic screenshots after visual-state stabilization;
- axe WCAG A/AA tags, with serious/critical violations blocking;
- canonical Configuration modal visibility and accessible form/control names.

CI workflow: `.github/workflows/browser-quality.yml`.

## 3. Controlled surfaces covered

Current UX-I1 coverage intentionally stays narrow:

1. Certification Registry DEV showcase.
2. Registry → canonical Case Overview fixture navigation.
3. Audit Workspace DEV fixture (`section=overview`).
4. Canonical Configuration route `/admin/configuration/schemes` with controlled API responses.
5. Configuration “Thêm chương trình” modal, including labelled fields and primary action.

This is browser regression coverage against controlled fixtures. It must not be described as full business E2E or SQL-backed UAT.

## 4. Final evidence run

Tested code candidate: `0fb67d043a8e9d834a0d3403f2359d39e8e2b0c2`.

Frontend quality workflow run `34971270907`: **PASS**.

Passed gates:

- application dependency install;
- production app typecheck;
- repository TypeScript typecheck;
- lint with zero warnings;
- production build;
- existing frontend tests.

Browser workflow run `34971271093`: **FAIL by design because unsuppressed production baseline debt remains**.

Browser infrastructure steps all passed:

- application dependency install;
- isolated browser-QA dependency install;
- Chromium installation;
- browser evidence upload.

Artifact: `cmp-browser-quality-1`, artifact ID `10397840114`, digest `sha256:c60b7649efc6ec8ee68290c4fb7bf3f8911b16835724527a39eefe151cb8a0e8`.

Final artifact inspection found **no remaining harness/selector/fixture failure**. The previous mobile Registry selector issue was removed by asserting the semantic Registry region, fixture content and visible “Mở hồ sơ” action rather than a responsive DOM tag.

## 5. Production baseline findings

### A. WCAG color contrast — serious

`color-contrast` is reproducible on both required viewports. Observed contrast ratios in the browser evidence range approximately from `3.31:1` to `4.43:1`, below the applicable `4.5:1` AA threshold for the affected normal text.

Representative affected areas include:

- CMP page-header identity/description text;
- Case Overview identity and secondary text;
- next-action explanatory text;
- Audit summary/secondary text;
- Configuration navigation labels, breadcrumb/current-page text, secondary text, tags, global-search hint and keyboard hint.

No contrast exception has been added to the test harness.

### B. Case Overview progress indicator accessible name — serious

Axe rule: `aria-progressbar-name`.

The Ant Design progress element (`.ant-progress`) rendered in Case Overview has no accessible name. This is reproducible at both desktop and mobile widths.

No rule disable or selector exclusion has been added.

### C. Ant Design deprecated API warnings — runtime console errors

The canonical Configuration route reproducibly emits:

```text
Warning: [antd: Drawer] `width` is deprecated. Please use `size` instead.
Warning: [antd: Space] `direction` is deprecated. Please use `orientation` instead.
```

Because UX-I1 treats `console.error` as a browser-quality failure, these warnings remain visible as baseline debt rather than being ignored.

## 6. Findings that did not reproduce as blockers

In the final tested candidate:

- no remaining Playwright locator/harness failure was found;
- no `Horizontal overflow detected` failure was found on the screens where the overflow gate runs, at either `1440x900` or `390x844`;
- no uncaught `pageerror` signature was found;
- no failed-request or HTTP 5xx signature was found in the final failure set;
- Configuration create-program fields are discoverable by accessible names: `Mã chương trình`, `Tên chương trình`, `Mô tả`, and the `Lưu` action;
- screenshot/trace/video/axe evidence is retained for failing browser runs.

## 7. Scope-safety verification

Compare from frontend canonical `9d207c39236a052157fddc397b74f9243eff2426` through the tested UX-I1 code candidate shows only QA/docs/workflow/config/script changes. There are no changes under `app/**` or `src/**`.

The root `package-lock.json` is unchanged. Playwright/axe remain dev/test infrastructure isolated in `e2e/`.

Therefore UX-I1 has not redesigned or patched production UI to make the browser gate pass.

## 8. Gate decision

**UX-I1 browser-QA infrastructure: IMPLEMENTED / TECHNICALLY WORKING.**

**Current production browser baseline: RED.**

**UX-I1 overall checkpoint: READY FOR USER REVIEW, NOT YET ACCEPTED OR LOCKED.**

The infrastructure exit criteria are met: deterministic browser command, desktop/mobile evidence, active axe gate, and existing frontend quality gates remain green. The selected production surfaces do not yet satisfy the active browser quality gate because the accessibility/runtime debts above remain intentionally unsuppressed.

Until the user reviews this checkpoint:

- do not declare the UX-I1 candidate as the new frontend canonical;
- do not start UX-I2 or later UX infrastructure phases;
- do not start CFG-2, CFG-3 or Step18B;
- do not silently convert the findings above into axe/console exceptions.
