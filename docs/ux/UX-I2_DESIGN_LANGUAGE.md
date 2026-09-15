# UX-I2 — CMP Design Language / Governed Tokens

Status: **READY FOR USER REVIEW**  
Date: **2026-09-16**  
Branch: `feature/ux-fix-batch01`  
UX-I1 code baseline: `9b50401661844188e3ea8c796c5bd680038af38c`  
Verification workflow: `35019596013`

## Decision

CMP keeps Ant Design 6 as its sole UI foundation. `antd-style` is compatible but is not installed because the existing `ConfigProvider` plus governed CSS/TypeScript tokens already meets UX-I2 requirements without production dependency churn.

UX-I2 is a governance/normalization phase, not a broad visual redesign. Density and breakpoint values are defined as opt-in references; they are not applied globally where doing so would alter the locked UX-I1 visual baseline.

## Governed contract

- `design-system/theme.ts`: typed Ant Design bridge plus foundation/breakpoint references.
- `design-system/tokens.css`: CSS token contract for brand, neutral, semantic state, typography, spacing, hierarchy, density, radius and elevation.
- `design-system/runtime-overrides.css`: narrow Ant Design/runtime compatibility rules using governed tokens only.
- `UiRuntime.tsx`: consumes `createCmpAntdTheme` instead of inline literals.

Temporary `ux-i1-accessibility-closure.css` is removed; its values are promoted into the governed contract.

## Representative consumers

Existing shared PageHeader/SectionHeader/status/diff components continue through `--cmp-*` variables; status borders and diff surfaces no longer contain one-off colors. App-shell typography, navigation group text, content width/gutters and dashboard elevation now reference governed tokens while preserving their previous numeric/color values.

Legacy `--ctic-*` aliases remain temporarily for older screens, but new shared UI must use `--cmp-*`.

## Verification

Workflow `35019596013` must pass before the candidate is committed:

- production app typecheck;
- repository TypeScript;
- lint;
- production build + full frontend tests;
- Chromium at 1440×900 and 390×844;
- Playwright console/network/overflow gates;
- axe WCAG A/AA serious/critical gate.

## Scope boundary

No database/schema/backend authority change, no Storybook, no ProComponents, no second UI framework, no business workflow/route change, and no broad screen redesign.

**UX-I2 implementation: COMPLETE / READY FOR USER REVIEW.**

Do not start UX-I3, CFG-2, CFG-3 or Step18B until this checkpoint is reviewed.
