# UX-I1 — Playwright + axe Browser QA Baseline

Status: **PASS / LOCKED**  
Closure date: **2026-09-16**  
Branch: `feature/ux-fix-batch01`  
Frontend canonical entering UX-I1: `9d207c39236a052157fddc397b74f9243eff2426`  
UX-I1 production closure code: `9b50401661844188e3ea8c796c5bd680038af38c`  
Locked verification candidate: `b9d1c60e42f9dc012def67f5ca1577ffb2f24834`

## 1. Purpose

UX-I1 establishes real-browser regression evidence for CMP before broader UI work begins. It is a QA foundation, not a visual redesign.

The browser gate runs Chromium at:

- desktop `1440x900`;
- mobile `390x844`.

It checks:

- route/view rendering;
- `console.error`;
- uncaught `pageerror`;
- failed network requests and HTTP 5xx responses;
- horizontal overflow;
- deterministic visual screenshots;
- axe WCAG A/AA rules with serious/critical violations blocking;
- labelled controls on the covered Configuration modal.

Controlled DEV fixtures remain explicitly distinct from SQL-backed UAT.

## 2. Tooling

Pinned isolated browser dependencies under `e2e/`:

- `@playwright/test@1.63.0`;
- `@axe-core/playwright@4.13.0`.

The root production dependency graph and root `package-lock.json` were not expanded for browser tooling.

Primary commands:

```text
npm run test:browser:setup
npm run test:browser
npm run test:browser:configuration
npm run test:browser:headed
```

CI workflow: `.github/workflows/browser-quality.yml`.

## 3. Covered surfaces

The locked UX-I1 baseline covers:

1. Certification Registry DEV showcase.
2. Registry → canonical Case Overview fixture navigation.
3. Audit Workspace DEV fixture (`section=overview`).
4. Canonical Configuration route `/admin/configuration/schemes` with controlled API responses.
5. Configuration “Thêm chương trình” modal and its labelled controls.

This is deterministic browser regression coverage, not full business E2E or SQL-backed UAT.

## 4. Baseline debts exposed and closed

The first working browser baseline correctly failed on production debt rather than suppressing it. The closure pass fixed only the measured issues.

### Accessibility

- WCAG normal-text contrast failures on covered Case/Audit/Configuration/shell surfaces were corrected.
- Case Overview progress indicator received an accessible name; `aria-progressbar-name` is now clean.
- Configuration success-status tags were adjusted to meet the active contrast gate.

No axe rule disable, selector exclusion or allowlist was introduced.

### Ant Design 6 runtime/deprecation cleanup

The browser gate exposed and the closure removed these warnings on the covered route:

- `Drawer.width` → `size`;
- `Space.direction` → `orientation`;
- Form instance used before its Modal Form was mounted → Modal Form pre-render wiring;
- `InputNumber.addonAfter` → `Space.Compact` based unit control.

The InputNumber migration preserves Form value/validation behavior through a small `RuleNumberInput` wrapper; it does not alter the business payload or validation rules.

## 5. Final verification evidence

Locked verification candidate: `b9d1c60e42f9dc012def67f5ca1577ffb2f24834`.

Frontend Quality run `35018522587`: **PASS**.

Passed:

- dependency installation;
- production app typecheck;
- repository TypeScript typecheck;
- lint;
- build;
- full frontend tests.

Browser Quality run `35018522697`: **PASS**.

Passed:

- application dependency install;
- isolated e2e dependency install;
- Chromium install;
- all 10 Playwright tests across desktop/mobile;
- axe gate;
- console/runtime gate;
- network/5xx gate;
- horizontal-overflow gate;
- evidence upload.

Browser evidence artifact:

- name: `cmp-browser-quality-1`;
- artifact ID: `10416588179`;
- digest: `sha256:34073899dff69b19ee2a580ee0f5505ffca1d2b5c8f3dea73679bf3b7df92d30`.

A preceding fail-closed closure workflow also required the exact source patch to pass typecheck, repository TypeScript, lint, full frontend tests and Playwright/axe before committing production code.

## 6. Scope safety

UX-I1 did not change database schema, business workflow, route authority, production dependency topology or page layout.

Production changes are limited to measured browser-quality closure points: accessibility semantics/contrast and Ant Design 6 API/wiring compatibility.

The browser harness remains strict: genuine axe or runtime failures must fail the gate rather than be silently ignored.

## 7. Gate decision

**UX-I1: PASS / LOCKED.**

The user approved continuing after this closure, so UX-I2 — CMP Design Language may begin from this locked baseline.

Still blocked unless separately reached/approved by the roadmap:

- CFG-2;
- CFG-3;
- Step18B;
- full SQL-backed release UAT.
