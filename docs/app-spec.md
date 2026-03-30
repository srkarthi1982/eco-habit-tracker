# App Spec: eco-habit-tracker

## 1) App Overview
- **App Name:** Eco Habit Tracker
- **Category:** Wellness / Habits
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Give an authenticated user a habit workspace for tracking recurring habits, logs, and archive state.
- **Primary User:** A signed-in user managing their own habit list.

## 2) User Stories
- As a user, I want to create habits, so that I can track repeatable behaviors.
- As a user, I want to log progress against a habit, so that I can measure consistency over time.
- As a user, I want to archive and restore habits, so that I can preserve history without deleting records.

## 3) Core Workflow
1. User signs in and opens `/app`.
2. User creates a habit from the workspace modal.
3. App stores the habit in the user-scoped database and lists it in the workspace.
4. User opens `/app/habits/:id` to edit the habit or log/remove progress.
5. User archives or restores habits and reviews the updated workspace summary.

## 4) Functional Behavior
- Habit and habit-log records are stored per authenticated user in the app database.
- The app supports create, update, progress logging, log removal, archive, restore, and detail viewing; hard delete is not part of V1.
- `/app` is protected and redirects to the parent login flow when unauthenticated.
- Invalid detail routes and cross-user access fall back safely to the workspace instead of returning `500`.

## 5) Data & Storage
- **Storage type:** Astro DB on the app’s isolated Turso database
- **Main entities:** Habits, habit logs
- **Persistence expectations:** User-owned habits and logs persist across refresh and new sessions.
- **User model:** Multi-user shared infrastructure with per-user isolation

## 6) Special Logic (Optional)
- Summary cards reflect totals, active/archived habits, recent logs, and completions today from persisted records.
- The app prevents duplicate log entries for the same habit and logged date.

## 7) Edge Cases & Error Handling
- Invalid IDs/routes: Invalid habit detail routes redirect safely back to `/app`.
- Empty input: Invalid create or update payloads should be rejected by the action layer.
- Unauthorized access: `/app` redirects to the parent login flow.
- Missing records: Missing or non-owned habits are not exposed to the requesting user.
- Invalid payload/state: Log duplication and invalid updates fail safely without corrupting UI state.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create a habit, open its detail page, edit it, and confirm the change persists.
- [ ] Log progress, remove the log, archive the habit, restore it, and confirm the workspace reflects each change.

### Safety tests
- [ ] Refresh after create or update and confirm the workspace list reflects persisted DB state without manual workaround.
- [ ] Visit an invalid detail route and confirm the app falls back safely to the workspace.
- [ ] Attempt cross-user detail access and confirm the app does not expose another user’s habit.

### Negative tests
- [ ] Attempt to create duplicate logs for the same date and confirm the action is blocked.
- [ ] Confirm there is no hard-delete habit flow in V1.

## 9) Out of Scope (V1)
- Shared household or team habit tracking
- Hard delete / recovery workflow
- AI-based coaching or recommendations

## 10) Freeze Notes
- V1 release freeze: this document reflects the verified authenticated habit-tracking workflow.
- Freeze Level 1 verification confirmed create, detail open, edit, log/remove, archive/restore, refresh persistence, invalid-route safety, and cross-user protection.
- During freeze, only verification fixes and cleanup are allowed; no undocumented feature expansion.
