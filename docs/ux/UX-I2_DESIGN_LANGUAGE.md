# UX-I2 — CMP Design Language / Governed Tokens

Status: **PASS / LOCKED**  
Date: **2026-09-16**  
Branch: `feature/ux-fix-batch01`  
UX-I1 accepted code baseline: `9b50401661844188e3ea8c796c5bd680038af38c`  
UX-I2 code candidate: `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db`  
Standard verification candidate: `1ea01b0b2841cd4b6b1bef9f32d0e0235d2eb593`

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

The fail-closed implementation workflow `35019596013` passed before the production patch was committed:

- production app typecheck;
- repository TypeScript;
- lint;
- production build + full frontend tests;
- Chromium at 1440×900 and 390×844;
- Playwright console/network/overflow gates;
- axe WCAG A/AA serious/critical gate.

The resulting code candidate was then checked again through the normal repository workflows on standard verification candidate `1ea01b0b2841cd4b6b1bef9f32d0e0235d2eb593`:

- Frontend Quality run `35020032804`: **PASS**;
- Browser Quality run `35020032766`: **PASS**;
- browser artifact: `cmp-browser-quality-1`;
- artifact ID: `10417486176`;
- digest: `sha256:988160936ebf99f349900e655b73f686ace7a3bec11eba45bba353823a1e1b50`.

No browser gate, axe rule, console warning or responsive condition was weakened for UX-I2.

## Scope boundary

No database/schema/backend authority change, no Storybook, no ProComponents, no second UI framework, no business workflow/route change, and no broad screen redesign.

The Product Owner accepted UX-I2 on 2026-09-16. The accepted frontend production canonical is now `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db`. Inspection of entering HEAD `5a92d0a2b5eb776ebb588be9feff287f9a179182` against this candidate found only this document and a browser-workflow verification comment; there are no intervening unreviewed production changes.

## Gate decision

**UX-I2: PASS / LOCKED.**

UX-I3 Storybook foundation is explicitly authorized under its own review checkpoint. UX-I4, CFG-2, CFG-3 and Step18B remain unstarted and out of scope.
