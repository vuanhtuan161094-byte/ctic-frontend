# UX-I3 — Storybook Foundation

Status / decision: **BLOCKED**  
Date: **2026-09-17**
Branch: `feature/ux-fix-batch01`  
Entering frontend HEAD: `5a92d0a2b5eb776ebb588be9feff287f9a179182`  
Accepted frontend production canonical: `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db` (UX-I2 PASS / LOCKED)  
UX-I2 acceptance documentation commit: `199a6e75fd508f6e9cf8e24bd46d533fa52f6c28`  
Published UX-I3 implementation checkpoint: `cd04edb33f330021221444c13b99d77e855d448b`, titled `chore(ux-i3): checkpoint blocked Storybook runtime investigation`. **BLOCKED; committed only for reproducibility and independent review, not an accepted production canonical.** The Phase A investigation below is a subsequent local, uncommitted patch.

## Single-worker diagnosis and closure verification — 2026-09-17 (current)

The subsequent user-authorized diagnosis distinguishes persistent dependency cache from Vite's in-memory transformed module graph. Both earlier cold/warm commands launched new servers; the second was not an in-memory warm-server experiment.

No source/configuration changed during diagnostics A/B. The root npm script nests another npm invocation, so `npm run test:browser -- --workers=1` did not forward the flag to Playwright (npm warned and launched four workers). That attempt was interrupted and is excluded. The platform-equivalent command used for all four valid diagnostics was `npm run test:browser -- -- --workers=1`; output explicitly confirms one worker. No retries, assertions, timeout, viewport, axe rule or cache manipulation was added.

| Diagnostic | Result | Vite ready | Desktop Registry visibility wait | Desktop Configuration heading wait |
| --- | --- | --- | --- | --- |
| A1: self-managed fresh server | **10/10 PASS**, 1.5m | 921ms | 4423ms | 3674ms |
| A2: self-managed fresh server | **10/10 PASS**, 2.0m | 1044ms | 6158ms | 4296ms |
| B1: external persistent server | **10/10 PASS**, 39.0s | 633ms | 3161ms | 1890ms |
| B2: same external server PID 4156 | **10/10 PASS**, 47.3s | Same process; no restart | 1910ms | 2174ms |

Visibility durations are the report's first content-visibility assertion durations, separate from navigation time. All are below the unchanged 8000ms limit. B used process-local `CMP_BROWSER_BASE_URL=http://127.0.0.1:5173`; the same listening PID was verified before each run. Runtime checks passed throughout: no captured page/console errors, failed requests or HTTP 5xx. Existing axe and overflow checks passed on their covered surfaces. Successful traces are not retained by the unchanged `retain-on-failure` policy; HTML reports retain step timings and axe attachments.

Under the user's explicit four-run decision criterion, classify the previous four-worker 6/4 failures as **local parallel dev-server/module-transform contention in the browser QA harness**, not a demonstrated production UI/business regression or a claim that Vite is defective. No application lazy-loading architecture was changed.

After all four diagnostic passes, the only harness correction is `workers: process.env.CI ? 1 : undefined` -> `workers: 1`, aligning normal local concurrency with existing GitHub CI. All other harness settings and tests are unchanged. The persistent server was stopped. The exact normal command `npm run test:browser`, with no flags or external-server override, then passed **10/10 twice**, in **39.9s / 39.5s** (Vite ready **541ms / 301ms**).

Final clean regression completed in the prescribed order:

| Final gate | Result |
| --- | --- |
| `npm ci` | **PASS**, 371 packages installed, 372 audited, 0 reported vulnerabilities; existing esbuild allowScripts warning unchanged |
| `npm run typecheck` / `typecheck:all` / `typecheck:storybook` | **PASS**, all three |
| `npm run lint` | **PASS**, zero warnings |
| `npm test` | **PASS**, production build (3280 modules) and **470/470** tests |
| `npm run build-storybook` | **PASS**, 3124 modules; existing large-chunk warning only |
| `npm run test:storybook` | **PASS 58/58**, 5.6m; addon a11y, runtime and overflow gates pass |
| `npm run test:browser` | **PASS 10/10**, 1.2m; Vite ready 731ms, regenerated dependency scan/bundle after clean install |
| Production browser quality | All existing runtime checks pass: no captured console/page errors, failed requests or HTTP 5xx. All eight existing axe/overflow-covered cases pass (the two configuration route smoke cases retain their original runtime/screenshot-only coverage) |
| Dependency integrity | No package/lockfile drift at root or e2e vs pushed blocked checkpoint |

**UX-I3 remains BLOCKED pending current-candidate GitHub CI.** Do not mark COMPLETE / READY FOR USER REVIEW until both standard push workflows pass for the new implementation SHA. No production acceptance/LOCKED claim is made. Evidence directory: `C:\Users\Admin\AppData\Local\Temp\cmp-ux-i3-one-worker-20260917`, with separate A1/A2/B1/B2/normal1/normal2 and final HTML reports, test-results and logs. Prior evidence and unrelated files are preserved. Accepted production canonical remains unchanged; all later roadmap phases remain unstarted. Backend checkpoint is updated only after frontend CI succeeds.

## Bounded closure attempt — 2026-09-17 (historical)

**BLOCKED — Case 3: cold and warm Browser Quality runs fail the same four visibility checks. No success candidate, commit or push was created.** The sections dated 2026-09-16 below are historical evidence, not post-token closure gates.

Preserved the local Phase A Storybook configuration. The only production change in this attempt is `--cmp-state-inactive: #737b87` -> `var(--cmp-neutral-700)` (`#5f6b7a`). Background, typography, other tokens, business logic, dependencies and browser harness are unchanged. Actual Storybook addon results measure **4.79:1** against `#f0f1f2` at 12px (previously 3.78:1; required 4.5:1).

| Current verification | Result |
| --- | --- |
| Targeted Status Semantics + All Semantic Tones, desktop/mobile | **PASS 4/4**, 1.5 minutes; addon a11y, runtime and overflow checks pass |
| Full `npm run test:storybook` | **PASS 58/58**, 4.2 minutes; Storybook a11y checks pass without suppressions |
| Subsequent `npm run build-storybook` | **PASS**, 3124 modules, 35.44 seconds; non-blocking chunk warning remains |
| A: exact `npm run test:browser`, cold Vite dependency cache | **FAIL: 6 PASS / 4 FAIL**, 50.0 seconds; Vite ready in 860ms |
| B: immediate exact `npm run test:browser`, warm cache | **FAIL: 6 PASS / 4 FAIL**, 44.3 seconds; Vite ready in 597ms |
| Production axe | Passes in six completed cases per run; not reached in four visibility failures; overall gate unverified |
| Final clean install / three typechecks / lint / production full tests | **NOT RERUN**: final regression sequence is gated on resolved browser determinism. Historical 2026-09-16 results below do not certify this token change |

Before A, port 5173 had no listening server. Only the validated generated `node_modules/.vite/deps` directory was removed. Both commands started their own Vite server; no timeout, worker, retry, configuration or environment workaround was introduced. Cold output includes dependency scanning/bundling; warm output does not, yet reproduces the same failures. Both use the existing local four-worker configuration and unchanged 8000ms assertions.

The four failures are the Registry `DEV · MOCK DATA` marker and Configuration `Chương trình & tiêu chuẩn` heading, each on desktop and mobile. Warm Registry trace shows navigation completing in 677ms, then the existing Suspense loading shell at approximately 751ms after navigation started. The visibility assertion subsequently fails after 8014ms; its failure snapshot still shows `Đang tải bản trình diễn`. Representative successful HTTP 200 module requests in that trace take about 2.7 seconds for CertificationCaseWorkspace/RegistryPage and 2.53 seconds for the Ant Design dependency. No console-error event was found in the inspected cold/warm desktop Registry context traces.

Observed failure mechanism is page readiness: the required content is not mounted before the existing assertion deadline. The deeper cause is **not conclusively isolated**. The loading path is the existing lazy/Suspense path in `app/components/CticApplication.tsx`; production source diff is limited to the inactive color token, while Phase A configuration is Storybook-only. There is no demonstrated causal link to the local UX-I3 changes. Cold/warm evidence does not justify the Case 2 pre-warm remedy. Under the Case 3 scope boundary, stop without a harness or broad production fix; do not label an unproven diagnosis as a confirmed legacy defect.

Evidence is preserved outside version control at `C:\Users\Admin\AppData\Local\Temp\cmp-ux-i3-closure-fff2ad65f382489db1653562ece83280`: targeted/full Storybook HTML reports, cold/warm browser logs, separate browser reports and complete cold/warm test-results including traces, videos and failure snapshots. Generated artifacts and unrelated user files are not staged or committed.

Frontend pushed checkpoint remains `cd04edb33f330021221444c13b99d77e855d448b`; backend remains `ab192f023a814c33002e65956cd9861f67131004`. Backend documentation is unchanged because the successful frontend-push prerequisite was not met. Accepted frontend production canonical remains `24039ac5f7dd0c3aa67e73bbc72c0e12c87de6db`. No dependency drift. Visual impact is limited to a darker inactive foreground; no business behavior change. UX-I4, CFG-2, CFG-3 and Step18B were not started. **STOP — UX-I3 remains BLOCKED.**

## Phase A runtime investigation — 2026-09-16

Starting pushed checkpoints: frontend `cd04edb33f330021221444c13b99d77e855d448b`, backend `ab192f023a814c33002e65956cd9861f67131004`, both refreshed on `feature/ux-fix-batch01` before changes. The accepted production canonical is unchanged.

### Root cause and bounded fix

The production React plugin is configured in the non-standard `vite.ctic.config.ts`. The blocked Storybook config supplied no explicit builder `viteConfigPath`. Inspection of the installed Storybook 10.6.0 builder shows that it passes that option to Vite's `loadConfigFromFile`; without it, the intended non-standard production configuration is not selected. The installed `@vitejs/plugin-react` 6.0.2 config hook supplies React integration and its own React/React DOM/JSX-runtime optimizer includes. Storybook was missing this integration.

Phase A adds only `.storybook/vite.config.ts` with `plugins: [react()]` and `envDir: false`, and points `framework.options.builder.viteConfigPath` in `.storybook/main.ts` to `.storybook/vite.config.ts`. The existing `viteFinal` environment isolation remains. The new config neither imports production Vite configuration nor calls `loadEnv`. Preview, UiRuntime, createCmpAntdTheme, tokens, runtime overrides and stories are unchanged.

Only the generated optimizer directory `node_modules/.cache/storybook/10.6.0/1c3385a5d25e538d10b518b310c74d3ca2690b6aaffeadccd74da79736171f86/sb-vite` was removed, after resolving/checking its exact path. Source files and unrelated artifacts were not deleted.

The prescribed single Colors reproduction then **PASSed (1/1; 3.0 minutes total)**, including rendering, addon accessibility, overflow and runtime checks. This confirms the missing React/Vite configuration hypothesis sufficiently for this checkpoint. **Phase A alone resolves the original raw React default-export failure. Phase B was not required or attempted; no manual React `optimizeDeps.include` was added.** No aliases, shims, vendor patches, dependency changes or permanent `force` configuration were introduced.

### Newly exposed accessibility blocker

Full Storybook verification now renders beyond Colors and exposes a distinct serious `color-contrast` violation on the existing `.cmp-tone-inactive` badge (`CANCELLED`, “Đã hủy”): foreground `#737b87`, background `#f0f1f2`, 12px text, measured contrast **3.78:1**, required **4.5:1**. The values are unchanged production tokens at `app/components/design-system/tokens.css`. They were not changed or overridden in Storybook, and no axe rule was disabled. This is outside the authorized runtime-configuration fix. UX-I3 remains **BLOCKED**, not technically complete or ready for acceptance.

### Phase A verification

| Command / check | Result |
| --- | --- |
| Exact single Colors command shown in the original evidence below | **PASS 1/1**, 3.0 minutes total, after clearing only the Storybook optimizer cache |
| `npm ci` | **PASS**, 371 packages installed, 372 audited, 0 reported vulnerabilities; existing esbuild allowScripts warning remains, no blanket approval added |
| `npm run typecheck` | **PASS** |
| `npm run typecheck:all` | **PASS** |
| `npm run typecheck:storybook` | **PASS** |
| `npm run lint` | **PASS**, max-warnings=0 |
| `npm run build-storybook` | **PASS**, 3124 modules; unchanged large-chunk warning, no envFile deprecation |
| `npm run test:storybook` | **54 PASS / 4 FAIL**, all 29 stories render on desktop 1440x900 and mobile 390x844; 7.6 minutes |
| Installed addon a11y | Completes for all 58 cases; four serious contrast failures, no suppressed rules |
| `npm test` | **PASS**, production build + **470/470** tests |
| `npm run test:browser` | **FAIL: 6 PASS / 4 FAIL**, 1.2 minutes; desktop/mobile Registry marker and Configuration heading visibility assertions timed out at the unchanged 8000ms limit |
| Existing production axe / runtime / overflow gates | PASS in the six completed passing cases; not reached in four initial page-visibility failures. No overall gate PASS claim. |
| Dependency diff vs pushed checkpoint | EMPTY for package.json/package-lock.json; no version changes or new production dependencies |
| Production source/config + preview + browser-gate diff | EMPTY for app, src, vite.ctic.config.ts, .storybook/preview.tsx and e2e |

Failed cases are `foundations-design-language--status-semantics` and `components-domainstatusbadge--all-semantic-tones` in both Storybook viewport projects. Every case reaches render and returns addon results; 54 also pass the subsequent overflow/runtime assertions. The four a11y failures stop before those subsequent assertions, so no all-catalog overflow/runtime PASS claim is made.

Before the existing production browser suite reused its output directories, full Storybook evidence was copied to the local temporary directory `C:/Users/Admin/AppData/Local/Temp/cmp-ux-i3-phase-a-fd380c84e66e4789b2e7723f075f78e3/`: `playwright-report/index.html`, full addon JSON attachments and `test-results/` failure traces/screenshots. These are generated, uncommitted artifacts.

The completed production browser run failed waiting for `getByText('DEV · MOCK DATA')` and `getByRole('heading', { name: 'Chương trình & tiêu chuẩn' })`, each on both desktop/mobile. Vite dependency scanning/bundling occurred during that run. The six later cases passed. A cold-start/resource-timing explanation is plausible but **not confirmed**. Its complete report/traces were preserved at `C:/Users/Admin/AppData/Local/Temp/cmp-ux-i3-browser-cold-c66922a685fd40f2ae5cfc824e659231/`. One exact-command retry was started without changing any source, timeout, worker or rule; it was interrupted before completion and supplies no replacement PASS result. Do not interpret the incomplete current output directory as a completed retry. No unrelated browser fix was attempted.

Exact installed versions after clean install: React **19.2.6**, React DOM **19.2.6**, Ant Design **6.5.3**, Vite **8.3.0**, `@vitejs/plugin-react` **6.0.2**, `storybook` / `@storybook/react-vite` / `@storybook/addon-a11y` **10.6.0**. No ProComponents, antd-style, aliases or new production dependencies were added. The only implementation changes are the two Storybook configuration files described above.

Because not all mandatory gates pass, no success implementation commit/candidate or push is created in this run. The previously pushed blocked checkpoint remains `cd04edb33f330021221444c13b99d77e855d448b`; the Phase A patch and this evidence update remain local for user direction. Production visual and business behavior are unchanged. UX-I4, CFG-2, CFG-3 and Step18B remain unstarted. The original checkpoint evidence below is historical, not a claim that the React export error still persists after Phase A.

## Original blocked checkpoint evidence (before Phase A)

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

## Blocked implementation architecture (review checkpoint)

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

## Original checkpoint verification status (before Phase A)

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
| GitHub Frontend Quality / Browser Quality | No UX-I3 result claimed at this checkpoint; older UX-I2 evidence is not reused as UX-I3 PASS. Push-triggered workflows do not change the BLOCKED decision. |
| `git diff --check` | PASS |
| Production source diff vs accepted UX-I2 (`app`, `src`) | EMPTY |

Non-gating build warnings: large development-tool chunks and plugin timings. Installation warned that esbuild 0.28.2 has a postinstall script not covered by allowScripts; no blanket install-script authorization was added. Neither warning explains away the runtime failure.

## Scope boundary and handoff

UX-I2 remains **PASS / LOCKED** based on Product Owner acceptance and its already verified evidence. UX-I3 remains **BLOCKED**, not READY, COMPLETE or LOCKED. The user authorized committing and pushing the exact blocked implementation for independent review. This checkpoint includes source/configuration/dependency files only, without generated build/browser output. No runtime fix or dependency-version change was attempted during checkpoint publication. This is not an accepted production canonical.

No production visual or business behavior changed; no backend production change, database/schema/migration, routes or workflow change. No temporary workflow was introduced. Existing untracked user reports/tests/artifacts are preserved. UX-I4, CFG-2, CFG-3 and Step18B have **not started**.

Next action: user decision on the newly exposed existing inactive-status contrast defect and the unpassed production browser visibility gate. The bounded React/Vite investigation is complete with Phase A success, but UX-I3 remains BLOCKED. Do not patch production tokens, advance the roadmap or silently change approved dependency versions without new authorization.

References: [official React/Vite framework documentation](https://storybook.js.org/docs/get-started/frameworks/react-vite), [official accessibility-addon documentation](https://storybook.js.org/docs/writing-tests/accessibility-testing). Installed 10.6.0 package metadata/types/source were also inspected directly.
