# CMP Frontend Codex Working Instructions

This is the CMP frontend repository (React + Vite + Ant Design). These instructions apply to agents working in this checkout.

## Read before working

- The owner request, current `git status --short --branch` / local diff, and `README.md`.
- The frontend UX guidance in `docs/ux/`, including the calendar and three-year fixture execution packets.
- The connected backend's [coordination protocol](https://github.com/vuanhtuan161094-byte/ctic-backend/blob/feature/ux-fix-batch01/docs/coordination/CMP_CODEX_CHATGPT_SYNC_2026-10-24.md), [Issue #1](https://github.com/vuanhtuan161094-byte/ctic-backend/issues/1) (latest comments), backend `AGENTS.md`, `AI_context.md` and relevant handoff when the backend checkout is available.

## Protect local and remote work

- Current authorized branch: `feature/ux-fix-batch01`. Check remote HEAD before commits.
- Preserve tracked/untracked work; no blind reset, clean, stash, force push, broad staging or main merge.
- Keep existing architecture, design tokens, white-label and real backend workflow/RBAC/SoD authority. Do not replace working modules with static mock data.
- Protected credentials, JWT, cookies, unrestricted runtime logs, raw SQL manifests and non-redacted screenshots never enter git or Issue comments.

## Visual acceptance and evidence

- When Windows/browser tools are available, verify *actual* DEMO frontend/API URLs before navigating. Capture real browser screenshots at `1366×768`, `1440×900`, and responsive `390×844` where supported.
- Test Dashboard, Customers, Application/Dossier, Portal, Tasks/Coordinator, Calendar, Personnel and Roles with permission-appropriate demo personas.
- Fix evidenced UX defects (spacing, oversized cards, legibility, duplicate dates, navigation, actions) and run focused regression. Include before/after evidence if safe and sanitized.
- Do not declare browser PASS on tests running only against `e2e/fixtures/cmp-demo-3year.mjs`. Three-year fixtures are not equivalent to live SQL DEMO operational history.

## Mandatory coordination checkpoint

After each meaningful step, attempt a redacted top-level comment in **backend GitHub Issue #1** (one shared thread for both repositories) using existing authenticated GitHub permissions. Include both real HEADs, changed files, verified tests, screenshots or `PENDING`, blockers and the next action. Follow the backend coordination protocol's template.

If unable to comment, produce a sanitized feature-branch checkpoint report if possible; otherwise explicitly state `ISSUE_SYNC_BLOCKED`. Never pretend an update was posted. No background sync service is configured.

**SQL Gate A is already PASS; never rerun it or change SQL/Windows privileges to satisfy visual tests.**
