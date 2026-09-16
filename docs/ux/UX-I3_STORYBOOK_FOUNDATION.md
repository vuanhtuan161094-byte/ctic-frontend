# UX-I3 — Storybook Foundation

Status / decision: **BLOCKED**  
Date: **2026-09-16**  
Branch: `feature/ux-fix-batch01`  
Entering frontend HEAD: `5a92d0a2b5eb776ebb588be9feff287f9a179182`  
Accepted frontend production canonical: `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db` (UX-I2 PASS / LOCKED)  
UX-I2 acceptance documentation commit: `199a6e75fd508f6e9cf8e24bd46d533fa52f6c28`  
UX-I3 implementation SHA: **none — implementation remains uncommitted because the runtime gate failed**.

## Stop decision and reproducible evidence

Storybook 10.6.0 builds and its development server reports ready, but the first story cannot render on this Windows checkout. Two development-server executions reproduced:

```text
Vite [Unhandled error] SyntaxError: The requested module
'/node_modules/react/index.js?v=…' does not provide an export named 'default'
```

The first execution used hash `ca189a6b`; the unchanged single-story retry used `4bb11e7d`. The retry was after initial dependency optimization, not a version/configuration workaround.

Exact bounded reproduction from the frontend root:

```powershell
npm run test:storybook -- --project=storybook-desktop --grep='design-language--colors$' --max-failures=1
```

Result: **1 failed**, `foundations-design-language--colors`, 39.8 seconds. The index includes the expected story, but `[data-cmp-story]` never becomes visible (30-second assertion timeout). Local, ignored evidence:

- `e2e/test-results/storybook/foundation-foundations-design-language--colors-storybook-desktop/error-context.md`
- same directory: `test-failed-1.png`, `trace.zip`
- `e2e/playwright-report/storybook/`

The original broader run was interrupted after the same first-story failure; it is not a completed 58-test result. The retry selected exactly one desktop test and stopped at its first failure.

This is a confirmed runtime/render blocker in the current setup, **not proof that every platform using this version family is incompatible**. The precise dependency-optimizer/interoperability root cause has not been isolated. No broad upgrade/downgrade, vendor patch, React alias, production-code workaround or disabled accessibility rule was attempted. Further compatibility investigation needs a new user decision; no technical-completion or acceptance claim is made.

## Exact versions and dependency assessment

Direct devDependencies, exact pins:

- `storybook`: **10.6.0**
- `@storybook/react-vite`: **10.6.0**
- `@storybook/addon-a11y`: **10.6.0** (only selected addon)

The resolved renderer, builder-vite and react-dom-shim are also 10.6.0. Independently versioned utility packages `@storybook/global` 5.0.0 and `@storybook/icons` 2.1.0 are transitive utilities, not conflicting framework releases.

Metadata peers accept React/React DOM 19, Vite 8 and TypeScript >=4.9. Tested host runtime: Node **24.19.0**. No engine/peer incompatibility was reported by installation; metadata compatibility did not guarantee successful development rendering.

Unchanged resolved application/toolchain versions:

| Package | Before / after |
| --- | --- |
| React / React DOM | 19.2.6 / 19.2.6 |
| Ant Design | 6.5.3 / 6.5.3 |
| Vite | 8.3.0 / 8.3.0 |
| TypeScript | 5.9.3 / 5.9.3 |

Lockfile comparison found 170 new package-path entries (including platform-specific optional packages), no removed existing package paths, and one existing version change: dev-only `@jridgewell/sourcemap-codec` 1.5.5 -> 1.6.0. This is required by Storybook's nested `magic-string` 1.4.1 (`^1.6.0`); the application's existing magic-string version remains unchanged. No existing production dependency version changed. No new direct production dependency, ProComponents, antd-style or UI framework. The existing browser dependency lockfile is unchanged.

## Local implementation architecture (not committed)

- `.storybook/main.ts`: React/Vite framework, one a11y addon, governed `stories/` directory, telemetry disabled. `envDir: false` prevents loading installation-specific `.env` inputs in the demo. Production Vite configuration is untouched.
- `.storybook/preview.tsx`: the existing `UiRuntime`, which imports `runtime-overrides.css` and uses the existing `createCmpAntdTheme`; direct import of `tokens.css`; Vietnamese document language and a semantic main landmark. Neutral sample content and the existing default branding, no hardcoded CTIC identity or second palette.
- `stories/*.stories.tsx`: existing design-system barrel exports; no parallel component implementation, backend access, router or business-state engine.
- `tsconfig.storybook.json` and `typecheck:storybook`: separate tooling typecheck without redefining existing app/repository commands. Existing lint is extended to inspect new tooling; generated Storybook output is ignored.
- `storybook`, `build-storybook`, `test:storybook`: additive scripts. Existing `dev`, `build`, `test`, `lint`, `typecheck`, `typecheck:all`, `test:browser*` semantics are preserved.
- `e2e/storybook.config.mjs` / `e2e/storybook/foundation.spec.mjs`: supplementary catalog checks, separate from the locked UX-I1 config/specs. Explicit 29-story inventory, desktop 1440x900 and mobile 390x844, runtime-error and overflow checks, actual installed a11y addon results attached in full. Serious/critical findings fail; no addon rules are suppressed. This test design is not yet validated past rendering because of the blocker above.

## Catalog

| Group | Stories |
| --- | --- |
| Foundations / Design language | Colors, Typography, Spacing, RadiusAndElevation, StatusSemantics |
| PageHeader | Default, ReadOnly, LongContent, ConstrainedWidth |
| SectionHeader | Default, WithAction, LongContent, ConstrainedWidth |
| DomainStatusBadge | Default, AllSemanticTones, UnknownCode, DetailedLabel |
| DeadlineSlaBadge | Default, DueSoon, Overdue, NotApplicable, MissingDeadline |
| States | Empty, EmptyWithAction, Error, ReadOnly |
| FormSection | Default, ValidationSummary, ConstrainedWidth |

All six semantic tones are represented using the existing application vocabulary: neutral, info, attention, positive, critical, inactive. SLA dates are deterministic examples, not a new date/state resolver. Foundation swatches and spacing/radius/elevation examples reference existing CSS custom properties rather than copied values. Width 390 is a review viewport, not a new design token.

## Verification status

| Command / gate | Observed result |
| --- | --- |
| Exact-pin `npm install --save-dev --save-exact ... --no-fund --no-audit` | PASS; 100 packages added, 1 changed |
| Clean root `npm ci` | NOT RUN before runtime stop; install above is not claimed as clean-install evidence |
| `npm --prefix e2e ci --no-fund --no-audit` | PASS |
| `npm --prefix e2e run install:chromium` | PASS; Chromium 153.0.8010.12 / Playwright build 1243 |
| `npm run typecheck:storybook` | PASS on initial catalog/config |
| `npm run typecheck` | PASS |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS, max-warnings=0 |
| `npm run build-storybook` | PASS on initial config; 3124 modules; initial `envFile: false` emitted deprecation warning and was changed to supported `envDir: false` before runtime tests. Final build after that change NOT rerun. |
| Storybook development startup/config/index | Server ready; index responds; runtime instance-registry warning present |
| Storybook story rendering | FAIL reproducibly as detailed above |
| Storybook addon accessibility | NOT REACHED; no PASS claim |
| Production build + full existing tests (`npm test`) | NOT RUN after blocker |
| Existing application Browser Quality / axe | NOT RUN for UX-I3; existing gates/config/specs/helpers unchanged |
| GitHub Frontend Quality / Browser Quality | NOT RUN for this uncommitted UX-I3 implementation; older UX-I2 evidence is not reused as UX-I3 PASS |
| `git diff --check` | PASS |
| Production source diff vs accepted UX-I2 (`app`, `src`) | EMPTY |

Non-gating build warnings: large development-tool chunks and plugin timings. Installation warned that esbuild 0.28.2 has a postinstall script not covered by allowScripts; no blanket install-script authorization was added. Neither warning explains away the runtime failure.

## Scope boundary and handoff

UX-I2 remains **PASS / LOCKED** based on Product Owner acceptance and its already verified evidence. UX-I3 remains **BLOCKED**, not READY, COMPLETE or LOCKED. Only the acceptance/blocker documentation is committed; the isolated implementation and dependency changes remain in the local worktree for review, without generated build/browser output in Git.

No production visual or business behavior changed; no backend production change, database/schema/migration, routes or workflow change. No temporary workflow was introduced. Existing untracked user reports/tests/artifacts are preserved. UX-I4, CFG-2, CFG-3 and Step18B have **not started**.

Next action: user decision on a bounded Storybook/Vite/React runtime-interoperability investigation. Do not advance the roadmap or silently change approved dependency versions.

References: [official React/Vite framework documentation](https://storybook.js.org/docs/get-started/frameworks/react-vite), [official accessibility-addon documentation](https://storybook.js.org/docs/writing-tests/accessibility-testing). Installed 10.6.0 package metadata/types/source were also inspected directly.
