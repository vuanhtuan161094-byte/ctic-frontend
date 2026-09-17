# UX-I3 — Storybook Foundation

Status / decision: **PASS / LOCKED**  
Date: **2026-09-17**  
Branch: `feature/ux-fix-batch01`  
Accepted frontend production canonical: `dac0bc3e6d50a36dee7fa3fa34dae6d3085c50b1`  
Previous UX-I2 canonical: `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db`  
Backend production code canonical: unchanged at `4714576475f6939d62093068e6321e4c61ec81eb`

## 1. Product Owner decision

The Product Owner explicitly accepted the local deterministic verification model for UX-I3 because GitHub Actions are unavailable due account billing/spending-limit restrictions and will not be restored for this project.

GitHub Actions are therefore **supplementary evidence only**, not a mandatory release gate for the current project workflow. A workflow that cannot start because no runner is assigned due billing/quota is recorded as infrastructure-unavailable evidence, not as a product or code failure.

UX-I3 is **PASS / LOCKED** based on reproducible clean local gates and the scope below. The frontend production canonical is promoted to `dac0bc3e6d50a36dee7fa3fa34dae6d3085c50b1`.

## 2. Final implementation

UX-I3 establishes Storybook as an isolated development/review surface for the existing CMP design system.

Pinned dev tooling:

- `storybook@10.6.0`
- `@storybook/react-vite@10.6.0`
- `@storybook/addon-a11y@10.6.0`
- existing React / React DOM `19.2.6`
- existing Ant Design `6.5.3`
- existing Vite `8.3.0`
- existing `@vitejs/plugin-react@6.0.2`

Architecture:

- `.storybook/main.ts` uses the React/Vite Storybook framework and the a11y addon.
- `.storybook/vite.config.ts` provides the isolated React Vite integration and does not load installation-specific `.env` values.
- `.storybook/preview.tsx` reuses the existing `UiRuntime`, `createCmpAntdTheme`, governed token CSS and runtime overrides.
- `stories/*.stories.tsx` exercises existing shared components; Storybook does not introduce a parallel design system.
- `e2e/storybook.config.mjs` and `e2e/storybook/foundation.spec.mjs` provide deterministic desktop/mobile catalog checks.

## 3. Storybook catalog

29 stories cover:

- Foundations / Design language: Colors, Typography, Spacing, Radius and Elevation, Status Semantics
- PageHeader
- SectionHeader
- DomainStatusBadge
- DeadlineSlaBadge
- Empty / Error / Read-only states
- FormSection

Required review viewports:

- desktop `1440×900`
- mobile `390×844`

## 4. Root-cause closure

The initial Storybook runtime failure was:

```text
SyntaxError: The requested module '/node_modules/react/index.js?...'
does not provide an export named 'default'
```

Root cause: the application React plugin is defined in the non-standard `vite.ctic.config.ts`, while Storybook had no explicit compatible React/Vite config for its development runtime.

Final fix:

- add isolated `.storybook/vite.config.ts` with `@vitejs/plugin-react`;
- point Storybook builder `viteConfigPath` to that config;
- preserve environment isolation;
- no React alias;
- no vendor patch;
- no Storybook/Vite downgrade;
- no manual `optimizeDeps.include` workaround.

The original Colors reproduction then passed.

## 5. Accessibility closure

Storybook exposed an existing inactive-status contrast defect:

- before: foreground `#737b87` on background `#f0f1f2` → approximately `3.78:1`;
- after: `--cmp-state-inactive: var(--cmp-neutral-700)` → resolved `#5f6b7a`;
- measured final contrast: **4.79:1**;
- required threshold: `4.5:1`.

No axe rule was disabled or suppressed. The only production visual effect is a slightly darker inactive-status foreground.

## 6. Browser determinism closure

The first local browser runs failed 6/10 because local Playwright used multiple workers against a fresh Vite dev server. The failure was reproduced as page-readiness contention, not as a product runtime error.

Bounded diagnostics all passed with one worker:

- self-managed server run #1: **10/10 PASS**
- self-managed server run #2: **10/10 PASS**
- persistent external server run #1: **10/10 PASS**
- persistent external server run #2: **10/10 PASS**

The harness now uses deterministic `workers: 1`, matching the previously intended CI concurrency. Timeouts, assertions, axe rules, viewport coverage and runtime checks remain unchanged.

The normal `npm run test:browser` command passed twice consecutively after the correction.

## 7. Final clean local gates

Final clean verification for candidate `dac0bc3e6d50a36dee7fa3fa34dae6d3085c50b1`:

| Gate | Result |
| --- | --- |
| `npm ci` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run typecheck:all` | **PASS** |
| `npm run typecheck:storybook` | **PASS** |
| `npm run lint` | **PASS**, zero warnings |
| production build + frontend tests | **PASS, 470/470** |
| `npm run build-storybook` | **PASS** |
| Storybook catalog | **PASS, 58/58** |
| Storybook addon a11y | **PASS** |
| Browser Quality | **PASS, 10/10** |
| production axe/runtime/network/overflow gates | **PASS on covered cases** |
| dependency drift | **NONE** |

## 8. GitHub Actions availability

Push-triggered runs for the candidate were unable to start:

- Frontend Quality run `35170575862`
- Browser Quality run `35170575850`

Both had zero executed steps and no runner assigned because the account reported a billing/spending-limit restriction. No browser artifact exists for those runs.

Per Product Owner decision, GitHub Actions will not be funded and are no longer a mandatory project gate. Do not repeatedly retrigger workflows merely to obtain unavailable cloud evidence.

For future frontend work, mandatory verification is a **clean, deterministic local gate sequence**. GitHub Actions may be used only when available without requiring account spending.

## 9. Scope safety

UX-I3 did not change:

- backend production code;
- database schema or migrations;
- business authority or certification workflow;
- route contracts;
- React / AntD / Vite production dependency versions;
- product branding model.

No ProComponents or `antd-style` was introduced.

## 10. Locked decision and next action

UX-I3 is now **PASS / LOCKED**.

Frontend production canonical:

`dac0bc3e6d50a36dee7fa3fa34dae6d3085c50b1`

Before UX-I4, run a dedicated **Visual Direction Gate**:

1. produce one high-fidelity reference mockup for `Configuration — Chương trình & tiêu chuẩn`;
2. obtain Product Owner visual approval;
3. sanity-check the same visual language against Case Overview;
4. only then start UX-I4 canonical reusable components.

UX-I4, CFG-2, CFG-3 and Step18B remain unstarted at this checkpoint.
