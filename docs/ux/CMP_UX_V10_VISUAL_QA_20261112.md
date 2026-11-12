# CMP UX-V10 — Visual audit and mobile fixes
Date: 12 November 2026

## Evidence
- Browser Quality run 43244660933: 144 passed, 1 failed; 216 screenshot files extracted from controlled fixture runs.
- Diagnostic run 43249106684: viewport 390px, root scrollWidth 396px; offenders `dossier-workspace-title` right edge 435px and `ant-card-extra` right edge 396px. Modal itself inherits root width, not the primary source.
- Mobile `audit-team-390.png`: name and role wrap into an artificially narrow column because stacked Ant Design List metadata does not stretch.
- No SQL DEMO, secrets, official certificate issuance or local Windows runtime were used.

## Fixes
1. Scope mobile card header stacking and shrink behavior to dossier workspace; do not hide global overflow.
2. Stretch mobile audit-team list metadata; preserve complete text and status badge.
3. Translate raw `not_started` status and exposed 'readiness' system text.
4. Add pixel-width assertions and login screen screenshots at desktop 1440/1366 and mobile 390.

## Verification policy
Require exact-SHA CI, Playwright screenshots and no horizontal overflow on affected screens. Controlled fixtures are not live SQL acceptance. This change must not alter RBAC, database schema, Gate A, credentials or business state transitions.
