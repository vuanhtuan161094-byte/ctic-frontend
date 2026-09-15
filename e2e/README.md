# CMP Browser QA — UX-I1

This directory is the **dev/test-only** browser QA harness introduced by UX-I1.

It is intentionally isolated from the application dependency graph. The application root keeps its existing production dependencies and root lockfile; Playwright and axe are pinned in `e2e/package.json` / `e2e/package-lock.json`.

## Scope boundary

The browser harness is not SQL-backed UAT.

Two evidence classes are kept separate:

1. **Controlled fixture QA** — deterministic DEV fixtures, intended for layout, navigation, runtime, overflow and accessibility checks.
2. **SQL-backed UAT** — real backend + SQL Server lifecycle validation. This remains a later gate and must never be claimed from the tests in this directory.

UX-I1 does not redesign production UI and does not authorize UX-I2, CFG-2, CFG-3 or Step18B.

## Required viewports

Every Playwright spec runs in Chromium at:

- Desktop: `1440x900`
- Mobile: `390x844`

## Commands

From the frontend repository root:

```bash
npm run test:browser:setup
npm run test:browser
npm run test:browser:configuration
npm run test:browser:headed
```

`test:browser:setup` installs the isolated e2e dependencies and the Chromium binary. The normal root `npm ci` remains unchanged.

When an already-running frontend should be used instead of Playwright starting Vite, set:

```bash
CMP_BROWSER_BASE_URL=http://127.0.0.1:5173 npm run test:browser
```

## Current UX-I1 coverage

### Controlled certification fixture

`specs/certification-workspaces.spec.mjs` uses the existing DEV-only certification showcase and checks:

- Registry rendering.
- Registry → case overview navigation.
- Audit workspace rendering.
- `console.error` / uncaught page errors.
- Failed browser requests and HTTP 5xx responses.
- Full-page horizontal overflow.
- axe WCAG A/AA rules; `serious` and `critical` violations are blocking.
- Deterministic full-page screenshot artifacts.

### Configuration canonical-route smoke

`specs/configuration-navigation.spec.mjs` opens the real canonical route:

`/admin/configuration/schemes`

The browser test injects a non-credential ADMIN session and intercepts backend calls with deterministic in-test fixture data. It verifies canonical routing and production component rendering without requiring SQL Server.

This configuration test deliberately **does not declare CFG-2 visual acceptance**. Responsive/visual closure for Configuration remains deferred to the locked roadmap.

## Artifacts

Per-run evidence is written to ignored runtime directories:

- `e2e/test-results/`
- `e2e/playwright-report/`

Screenshots are attached to the Playwright result. They are browser baselines for UX review, not business-data evidence and not SQL-backed UAT evidence.

## Accessibility policy

The initial UX-I1 gate runs axe tags:

- `wcag2a`
- `wcag2aa`
- `wcag21a`
- `wcag21aa`

`critical` and `serious` violations fail controlled visual tests. Moderate/minor findings stay visible in the attached axe JSON for review. Any future rule exception must be documented with route, rule id, reason and intended removal gate; silent disablement is not allowed.
