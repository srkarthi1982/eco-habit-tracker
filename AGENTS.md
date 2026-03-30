⚠️ Mandatory: AI agents must read this file before writing or modifying any code.

# AGENTS.md

This file complements the workspace-level Ansiversa-workspace/AGENTS.md (source of truth). Read workspace first.

MANDATORY: After completing each task, update this repo’s AGENTS.md Task Log (newest-first) before marking the task done.

## Scope
- Mini-app repository for 'eco-habit-tracker' within Ansiversa.
- Follow the parent-app contract from workspace AGENTS; do not invent architecture.

## Phase Status
- Freeze phase active: no new features unless explicitly approved.
- Allowed: verification, bug fixes, cleanup, behavior locking, and documentation/process hardening.

## Architecture & Workflow Reminders
- Prefer consistency over speed; match existing naming, spacing, and patterns.
- Keep Astro/Alpine patterns aligned with ecosystem standards (one global store pattern per app, actions via astro:actions, SSR-first behavior).
- Do not refactor or change established patterns without explicit approval.
- If unclear, stop and ask Karthikeyan/Astra before proceeding.

## Where To Look First
- Start with src/, src/actions/, src/stores/, and local docs/ if present.
- Review this repo's existing AGENTS.md Task Log history before making changes.

## Task Log (Recent)
- 2026-03-30 Initialized app-spec.md using standard V1 template from web repo.
- 2026-03-29 Completed Freeze Level 1 repair + verification: fixed Alpine store reactivity so create/update/archive/restore flows reflect DB changes without manual reloads, then revalidated `npm run typecheck`, `npm run build`, `npm run db:push`, and authenticated browser flows (create, detail, edit, log/remove, archive/restore, refresh, invalid-route safety, cross-user protection).
- 2026-03-29 Completed readiness repair pass after DB isolation sweep: fixed Alpine store typing in `src/alpine.ts`, preserved app-specific Turso isolation, and revalidated `npm run typecheck`, `npm run build`, and `npm run db:push`.
- 2026-03-29 Synced local repo to `origin/main` after stale local seed commit divergence blocked pull; preserved prior local state on `backup/pre-pull-sync-2026-03-29`.
- Keep newest first; include date and short summary.
- 2026-03-25 Implemented Habit Tracker V1 end-to-end (Astro DB Habits/HabitLogs schema, authenticated /app + /app/habits/[id], Astro actions with ownership enforcement + archive/restore + duplicate log guard, Alpine global store, dashboard summary webhook + high-signal notification hooks, premium landing/workspace/detail UX); validation: build passes, typecheck blocked by restricted package install for @astrojs/check.
- 2026-02-09 Added repo-level AGENTS.md enforcement contract (workspace reference + mandatory task-log update rule).
- 2026-02-09 Initialized repo AGENTS baseline for single-repo Codex/AI safety.
