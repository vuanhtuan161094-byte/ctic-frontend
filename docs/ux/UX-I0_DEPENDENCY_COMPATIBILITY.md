# UX-I0 — Dependency / Compatibility Audit

Status: **COMPLETE FOR REVIEW**  
Audit date: **2026-09-15**  
Branch: `feature/ux-fix-batch01`

## 1. Guardrails

This audit follows the current CMP checkpoint in backend `AI_context.md`.

- Current frontend stack stays authoritative: React `19.2.6`, React DOM `19.2.6`, Ant Design `6.5.3`, Vite `8.3.0`, TypeScript `5.9.3`, Node `^22.12.0 || ^24.0.0`.
- UX-I0 is compatibility work only. It does not redesign production UI.
- Only dependencies required by UX-I1 may be introduced now.
- `antd-style` stays blocked until UX-I2 is explicitly approved.
- Storybook stays blocked until UX-I3 is explicitly approved.
- ProComponents stays blocked until UX-I5 is explicitly approved.
- Penpot/MCP remains an external optional spike and is not part of this dependency change.

## 2. Compatibility matrix

| Package / family | Exact candidate | Classification | Compatibility result | Decision now | Notes |
| --- | --- | --- | --- | --- | --- |
| `@playwright/test` | `1.63.0` | Dev/test only | Node `>=20`; compatible with CMP Node 22.12+/24 | **GO — UX-I1** | Pin exact version; Chromium is the first controlled browser baseline. |
| `@axe-core/playwright` | `4.13.0` | Dev/test only | Depends on `axe-core ~4.13.0`; peer `playwright-core >=1.0.0` | **GO — UX-I1** | Pin exact wrapper version; lock transitive packages. |
| `antd-style` | `4.1.0` | Production runtime if adopted | Peer `antd >=6.0.0`, `react >=18`; compatible with AntD 6 / React 19 | **HOLD — UX-I2** | Technically compatible, but installation would start the design-language phase. Do not install in UX-I0/I1. |
| `storybook` | `10.6.0` | Dev/test only | Current React/Vite framework supports React 19 and Vite 8 | **HOLD — UX-I3** | Keep Storybook core/framework versions aligned exactly. |
| `@storybook/react-vite` | `10.6.0` | Dev/test only | Peer range includes React `^19` and Vite `^8` | **HOLD — UX-I3** | No Storybook files are created in UX-I1. |
| `@storybook/addon-a11y` | `10.6.0` | Dev/test only | Same Storybook release line; uses axe-core | **HOLD — UX-I3** | Add only when Storybook foundation is approved. |
| `@ant-design/pro-components` | stable `2.8.10` | Production runtime | Stable peer range is AntD 4/5, not AntD 6 | **NO-GO** | Do not install stable 2.x into the current AntD 6 app. |
| `@ant-design/pro-components` | beta `3.1.14-7` | Production runtime candidate | 3.x line targets AntD `^6`, React >=18, Node >=22.12 | **HOLD / PILOT ONLY — UX-I5** | Beta/prerelease. Re-audit exact beta at UX-I5 before any isolated pilot. No broad migration. |

## 3. Evidence checked

Version and peer/dependency evidence was checked against the package registries and upstream package metadata on 2026-09-15:

- https://www.npmjs.com/package/@playwright/test?activeTab=versions
- https://www.npmjs.com/package/@axe-core/playwright?activeTab=versions
- https://www.npmjs.com/package/antd-style?activeTab=versions
- https://unpkg.com/antd-style@4.1.0/package.json
- https://www.npmjs.com/package/@storybook/react-vite?activeTab=versions
- https://github.com/storybookjs/storybook/blob/v10.6.0/code/frameworks/react-vite/package.json
- https://www.npmjs.com/package/@storybook/addon-a11y?activeTab=versions
- https://www.npmjs.com/package/@ant-design/pro-components?activeTab=versions
- https://github.com/ant-design/pro-components/blob/master/package.json

## 4. Installation architecture for UX-I1

UX-I1 browser tooling is deliberately isolated under `e2e/` with its own `package.json` and `package-lock.json`.

Reasons:

1. Playwright and axe are test infrastructure, not application runtime dependencies.
2. The existing root lockfile remains unchanged, so current root `npm ci`, production build, lint and unit/regression behavior are not coupled to browser tooling installation.
3. Browser dependencies can be pinned exactly and cached independently in CI.
4. UX-I1 can be removed or upgraded without perturbing the production dependency graph.

The root `package.json` may expose convenience scripts only. Script-only changes do not change the root dependency graph.

## 5. UX-I1 baseline contract

The initial browser harness must enforce:

- Chromium baseline at `1440x900` and `390x844`.
- Browser/page `console.error` and uncaught page errors fail the test unless explicitly reviewed.
- Horizontal page overflow is detected at both required viewports.
- Axe checks run against WCAG A/AA rule tags; serious/critical violations fail unless an explicit reviewed exception is documented.
- Controlled DEV fixtures remain clearly distinct from SQL-backed UAT.
- Screenshots are deterministic run artifacts; they are not presented as SQL-backed evidence.
- Production UI behavior is not redesigned as part of UX-I1.

## 6. Gate decision

**UX-I0 dependency audit: PASS / ready for user review.**

Authorized for implementation in the current checkpoint:

- `@playwright/test@1.63.0`
- `@axe-core/playwright@4.13.0`

Not authorized yet:

- `antd-style`
- Storybook packages
- ProComponents
- Penpot/MCP integration
- any UX-I2+ work
