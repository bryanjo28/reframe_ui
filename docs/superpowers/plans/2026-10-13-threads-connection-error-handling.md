# Threads Connection and Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate application authentication from the backend-managed Threads connection and give every Threads operation consistent connect, reconnect, retry, and error behavior.

**Architecture:** Normalize Threads account state once in `authService`, preserve structured API errors in all Threads services, and classify those errors in a focused `threadsErrors` utility. `AppShell` owns the normalized connection status and passes it to Dashboard and scheduling UI; account disconnect refreshes the authoritative auth state.

**Tech Stack:** React 19, TypeScript 6, Vitest 5, Testing Library, Vite 8

**Spec:** `docs/superpowers/specs/2026-10-13-threads-connection-error-handling-design.md`

## Global Constraints

- The frontend must never read, store, or expose a Threads access or refresh token.
- The application login token remains supported and continues to authorize backend API requests.
- Only application-authentication error codes may dispatch `reframe:session-expired`.
- Existing backend camelCase and snake_case response variants remain accepted.
- Reconnect uses the existing Threads authorization flow.

## Review Focus

- A `401 THREADS_RECONNECT_REQUIRED` must retain its error code without logging the user out.
- A `401 THREADS_REFRESH_FAILED` must remain a retryable temporary failure.
- `needsReconnect: true` with `connected: false` must render reconnect, not disconnected.
- A callback containing both `connected=true` and `error` must show only the error path.
- A failed Dashboard reload must not display counts from the previous successful request.

---

### Task 1: Structured Threads errors and session-expiry rules

**Files:**
- Create: `src/utils/threadsErrors.ts`
- Modify: `src/utils/apiError.ts`
- Modify: `tests/apiErrorPresentation.test.ts`
- Create: `tests/threadsErrors.test.ts`

**Interfaces:**
- Produces: `ThreadsErrorAction`, `getThreadsErrorAction(error: unknown): ThreadsErrorAction`
- Produces: `isApplicationAuthError(error: ApiError): boolean`

- [ ] **Step 1: Write failing tests** for all Threads error-code mappings and for session-expired dispatch on `INVALID_ACCESS_TOKEN`/`UNAUTHORIZED` but not Threads connection error codes.
- [ ] **Step 2: Run the focused tests and verify they fail for missing classification and current blanket-401 logout behavior.**
- [ ] **Step 3: Implement the classifier and narrow `createApiResponseError` session expiration to application-authentication codes.**
- [ ] **Step 4: Run the focused tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 2: Secure Threads account normalization

**Files:**
- Modify: `src/services/authService.ts`
- Modify: `tests/authService.test.ts`

**Interfaces:**
- Produces: `ThreadsConnectionStatus = 'connected' | 'needs_reconnect' | 'disconnected'`
- Produces: `getThreadsConnectionStatus(account?: ThreadsSocialAccountState | null): ThreadsConnectionStatus`
- Produces: `invalidateAuthStateCache(): void`
- Updates: `ThreadsSocialAccountState` without Threads token fields

- [ ] **Step 1: Write failing tests** proving token fields are discarded, dummy state does not override backend state, and explicit/boolean variants normalize to all three statuses.
- [ ] **Step 2: Run `tests/authService.test.ts` and verify the new tests fail for the current token and dummy behavior.**
- [ ] **Step 3: Remove dummy Threads state and token parsing, add status normalization, and expose cache invalidation without clearing the login token.**
- [ ] **Step 4: Run the auth-service tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 3: Preserve structured errors in Threads services

**Files:**
- Modify: `src/services/threadsAuth.ts`
- Modify: `src/services/threadsAutoPost.ts`
- Modify: `src/services/contentOutputs.ts`
- Create: `tests/threadsServices.test.ts`

**Interfaces:**
- Consumes: `createApiResponseError(status: number, data: unknown): ApiResponseError`
- Produces: structured failures from connect, delete, run, schedule, reschedule, cancel, and retry operations

- [ ] **Step 1: Write failing service tests** asserting backend status, `error_code`, and message survive schedule and retry failures, with representative coverage for connect/delete and other mutations.
- [ ] **Step 2: Run the focused tests and verify ordinary `Error` instances currently lose the backend code.**
- [ ] **Step 3: Add one shared response-body parser where appropriate and throw `createApiResponseError` from every failed Threads response.**
- [ ] **Step 4: Run the focused service tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 4: Callback and Connected Accounts state machine

**Files:**
- Modify: `src/utils/threadsCallback.ts`
- Modify: `src/pages/ConnectingAppsPage.tsx`
- Modify: `tests/ThreadsCallbackPage.test.tsx`
- Create: `tests/ConnectingAppsPage.test.tsx`

**Interfaces:**
- Consumes: `getThreadsConnectionStatus`, `invalidateAuthStateCache`, `getThreadsErrorAction`
- Produces: mutually exclusive callback result and status-derived account actions

- [ ] **Step 1: Write failing tests** for error-priority callback sanitization, `connected: false + needsReconnect: true`, status labels/buttons, and disconnect refetch.
- [ ] **Step 2: Run the focused tests and verify they fail against the current independent callback branches and boolean gate.**
- [ ] **Step 3: Make callback success/error mutually exclusive, derive UI from normalized status, and invalidate/refetch auth state after delete.**
- [ ] **Step 4: Run the focused tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 5: Propagate connection status and actions through operational pages

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/AutoPostPage.tsx`
- Modify: `src/pages/ContentBankPage.tsx`
- Modify: `src/pages/ContentEnginePage.tsx`
- Modify: `tests/AutoPostBatchSelection.test.tsx`
- Modify: `src/pages/ContentBankPage.test.tsx`
- Modify: `tests/ContentEngineGenerationNotifications.test.tsx`

**Interfaces:**
- Consumes: `ThreadsConnectionStatus`, `getThreadsErrorAction`
- Produces: reconnect/connect navigation and temporary retry messaging at each Threads operation boundary

- [ ] **Step 1: Write failing component tests** for reconnect-required schedule/retry behavior and refresh-failed retry messaging without navigation or logout.
- [ ] **Step 2: Run focused component tests and verify the current generic-message behavior fails them.**
- [ ] **Step 3: Store normalized status in `AppShell`, pass it to operational pages, and render action-specific messages/buttons from the central classifier.**
- [ ] **Step 4: Run focused component tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 6: Dashboard status and load-error correctness

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Create: `tests/DashboardPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ThreadsConnectionStatus`
- Produces: distinct connect/reconnect next actions and visible non-stale loading errors

- [ ] **Step 1: Write failing Dashboard tests** for reconnect copy/navigation and for clearing pipeline, recent content, and pillar count after a failed reload.
- [ ] **Step 2: Run the Dashboard tests and verify they expose the boolean-only status and swallowed-error behavior.**
- [ ] **Step 3: Accept normalized status, add a user-visible load error, and reset all loaded Dashboard state in the failure branch.**
- [ ] **Step 4: Run the Dashboard tests and verify they pass.**
- [ ] **Step 5: Commit the task.**

### Task 7: Full regression verification

**Files:**
- Review: all files changed in Tasks 1–6

**Interfaces:**
- Consumes: all prior task outputs
- Produces: verified build with no known regression in the requested scope

- [ ] **Step 1: Run `npm test` and resolve every reported failure without weakening assertions.**
- [ ] **Step 2: Run `npm run lint` and resolve all errors introduced by this work.**
- [ ] **Step 3: Run `npm run build` and resolve TypeScript or bundling errors.**
- [ ] **Step 4: Run `git diff --check` and inspect `git diff --stat` plus the final diff for unrelated changes or secret/token exposure.**
- [ ] **Step 5: Commit final verification-only adjustments if any.**
