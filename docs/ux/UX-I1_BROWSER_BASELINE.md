# UX-I1 — Playwright + axe Browser QA Baseline

Status: **CLOSURE CANDIDATE — VERIFICATION RUNNING**  
Baseline date: **2026-09-15**  
Branch: `feature/ux-fix-batch01`  
Frontend canonical entering UX-I1: `9d207c39236a052157fddc397b74f9243eff2426`  
UX-I1 tested infrastructure candidate: `0fb67d043a8e9d834a0d3403f2359d39e8e2b0c2`  
Approved closure code candidate: `2c74a9c18bd8b2ebf18f7d6fa25631d4ae3f0426`

## 1. Scope and guardrails

UX-I1 establishes browser-level regression evidence. The user subsequently approved a narrow closure pass for the three production debts exposed by that harness. The closure is limited to accessibility and deprecated-API corrections; it is not a visual redesign and does not begin UX-I2.

Guardrails preserved:

- no database/schema changes;
- root production dependency graph and root `package-lock.json` remain unchanged;
- browser tooling is isolated under `e2e/` with its own lockfile;
- controlled DEV fixtures are explicitly not SQL-backed UAT;
- known production accessibility/runtime findings are not suppressed or whitelisted to make CI green;
- UX-I2+, CFG-2, CFG-3 and Step18B remain blocked pending UX-I1 closure verification/review.

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

## 4. Pre-closure evidence run

Tested infrastructure candidate: `0fb67d043a8e9d834a0d3403f2359d39e8e2b0c2`.

Frontend quality workflow run `34971270907`: **PASS**.

Passed gates:

- application dependency install;
- production app typecheck;
- repository TypeScript typecheck;
- lint with zero warnings;
- production build;
- existing frontend tests.

Browser workflow run `34971271093`: **FAIL by design because unsuppressed production baseline debt remained**.

Browser infrastructure steps all passed:

- application dependency install;
- isolated browser-QA dependency install;
- Chromium installation;
- browser evidence upload.

Artifact: `cmp-browser-quality-1`, artifact ID `10397840114`, digest `sha256:c60b7649efc6ec8ee68290c4fb7bf3f8911b16835724527a39eefe151cb8a0e8`.

Final artifact inspection found **no remaining harness/selector/fixture failure**. The previous mobile Registry selector issue was removed by asserting the semantic Registry region, fixture content and visible “Mở hồ sơ” action rather than a responsive DOM tag.

## 5. Production baseline findings before closure

### A. WCAG color contrast — serious

`color-contrast` reproduced on both required viewports. Observed contrast ratios ranged approximately from `3.31:1` to `4.43:1`, below the applicable `4.5:1` AA threshold for affected normal text.

Representative affected areas included:

- CMP page-header identity/description text;
- Case Overview identity and secondary text;
- next-action explanatory text;
- Audit summary/secondary text;
- Configuration navigation labels, breadcrumb/current-page text, secondary text, tags, global-search hint and keyboard hint.

No contrast exception was added to the test harness.

### B. Case Overview progress indicator accessible name — serious

Axe rule: `aria-progressbar-name`.

The Ant Design progress element (`.ant-progress`) rendered in Case Overview had no accessible name. This reproduced at both desktop and mobile widths.

No rule disable or selector exclusion was added.

### C. Ant Design deprecated API warnings — runtime console errors

The canonical Configuration route reproducibly emitted:

```text
Warning: [antd: Drawer] `width` is deprecated. Please use `size` instead.
Warning: [antd: Space] `direction` is deprecated. Please use `orientation` instead.
```

Because UX-I1 treats `console.error` as a browser-quality failure, these warnings remained visible as baseline debt rather than being ignored.

## 6. Findings that did not reproduce as blockers

In the final pre-closure infrastructure candidate:

- no remaining Playwright locator/harness failure was found;
- no `Horizontal overflow detected` failure was found on the screens where the overflow gate runs, at either `1440x900` or `390x844`;
- no uncaught `pageerror` signature was found;
- no failed-request or HTTP 5xx signature was found in the final failure set;
- Configuration create-program fields are discoverable by accessible names: `Mã chương trình`, `Tên chương trình`, `Mô tả`, and the `Lưu` action;
- screenshot/trace/video/axe evidence is retained for failing browser runs.

## 7. Scope-safety verification

The infrastructure implementation up to `0fb67d043a8e9d834a0d3403f2359d39e8e2b0c2` contained no production `app/**` repair. After user approval, closure candidate `2c74a9c18bd8b2ebf18f7d6fa25631d4ae3f0426` changes only the source points necessary to close the three measured debts:

- add an accessible name to the Case Overview progress indicator;
- replace deprecated Ant Design `Drawer.width` with `size`;
- replace deprecated Ant Design `Space.direction` with `orientation`;
- use semantic success tags instead of the low-contrast green preset on the covered Configuration program/status surface;
- raise the existing CMP/AntD secondary text contrast and narrowly correct sidebar/search-hint contrast.

No business workflow, route contract, schema, production dependency or page layout is changed by the closure candidate.

## 8. Gate decision before closure verification

**UX-I1 browser-QA infrastructure: IMPLEMENTED / TECHNICALLY WORKING.**

The original production browser baseline was **RED** and accurately exposed the three debts above.

The user approved correcting those debts without entering UX-I2. Closure candidate `2c74a9c18bd8b2ebf18f7d6fa25631d4ae3f0426` is now subject to the same frontend quality and browser gates. UX-I1 must not be declared PASS/LOCKED until those verification runs complete.

## 9. Phase boundary

Until closure verification is complete and the checkpoint is reported:

- do not start UX-I2 or later UX infrastructure phases;
- do not start CFG-2, CFG-3 or Step18B;
- do not weaken axe/console gates to obtain a green run;
- controlled browser QA remains distinct from SQL-backed business UAT.
