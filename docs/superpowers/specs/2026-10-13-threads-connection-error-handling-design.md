# Threads Connection and Error Handling Design

## Goal

Make the frontend treat the application login session and the backend-managed Threads connection as separate concerns. Threads connection failures must never sign the user out unless the backend explicitly reports an invalid application credential.

## Scope

This change covers the Threads callback, account status, disconnect, publish-run, schedule, reschedule, cancel, and retry flows. It also propagates the normalized Threads connection status to Connected Accounts and Dashboard. Other provider integrations and unrelated dashboard redesign work are out of scope.

## Data and Security Boundary

The frontend stores and sends only the application login token. Threads `accessToken`, `refreshToken`, and equivalent token fields are neither read from `/api/auth/me` nor exposed through `ThreadsSocialAccountState`.

The development-only dummy Threads account is removed so local UI state reflects the backend response.

## Connection State

The frontend uses one normalized state:

- `connected`: Threads operations are available.
- `needs_reconnect`: the account exists but user authorization must be renewed.
- `disconnected`: no usable Threads connection exists.

Explicit backend status has priority. Existing boolean fields remain accepted for compatibility, but `needsReconnect: true` must produce `needs_reconnect` even when `connected` is false. Missing or unknown account data defaults to `disconnected`.

UI labels and actions are derived from this state:

- `connected`: show “Terhubung” and “Disconnect Threads”.
- `needs_reconnect`: show “Perlu dihubungkan ulang” and “Hubungkan Ulang Threads”.
- `disconnected`: show “Tidak terhubung” and “Connect Threads”.

The reconnect button starts the same authorization flow as first-time connection.

## Error Classification

API response errors retain HTTP status, backend `error_code`, and message. A central Threads classifier maps:

- `THREADS_RECONNECT_REQUIRED` to action `reconnect` and the message “Koneksi Threads telah kedaluwarsa. Hubungkan kembali akun Anda.”
- `THREADS_REFRESH_FAILED` to action `retry` and a temporary-failure message. It must not mark the account as requiring reconnect.
- `THREADS_ACCOUNT_NOT_FOUND` to action `connect` and the message “Akun Threads belum terhubung.”
- Other errors to action `error` and the backend/user-safe fallback message.

An HTTP `401` triggers the application session-expired event only for application-authentication errors such as `INVALID_ACCESS_TOKEN` and `UNAUTHORIZED`. `THREADS_RECONNECT_REQUIRED`, `THREADS_REFRESH_FAILED`, and `THREADS_ACCOUNT_NOT_FOUND` never trigger application logout.

All Threads mutations use the shared API error representation so UI consumers can choose the correct action.

## User Flows

### OAuth callback

An `error` callback parameter takes priority over `connected=true`; success and error are never displayed together. A success message is shown only when the callback reports success without an error. Sensitive callback parameters remain discarded.

### Publish, schedule, and retry

When a Threads operation returns `reconnect`, the page displays the reconnect message and offers “Hubungkan Ulang Threads”, navigating to Connected Accounts where the standard connect flow runs. A `retry` action displays the temporary error and leaves the user on the current page with a retry affordance. A `connect` action directs the user to connect Threads.

### Disconnect

After a successful delete, cached auth state is invalidated and `/api/auth/me` is fetched again. While that refresh completes, the local fallback state is explicitly `disconnected`, with `connected: false`, `needsReconnect: false`, and no Threads token-related fields.

## Dashboard

Dashboard receives the normalized Threads status rather than a single boolean, allowing its next action to distinguish connect from reconnect. Loading failures are visible to the user and clear data from the failed load so stale counts are not presented as current data. Existing content-pipeline behavior remains otherwise unchanged.

## Testing

Automated tests cover:

- conflicting callback parameters;
- absence of Threads token fields in normalized auth state;
- normalization of all three connection statuses;
- application logout behavior for each relevant `401` error code;
- central Threads error actions;
- error-code preservation in schedule and retry services;
- disconnect refresh behavior;
- Connected Accounts reconnect rendering;
- Dashboard reconnect action and failed-load state.

The complete test suite, lint, and production build are run before completion.
