# Code Review — `ab407ec` *(code-reviewer skill)*
**fix(cloudfiles): fix Google Drive token refresh and reconnect token preservation**

PR: https://github.com/coneshare/coneshare/pull/358

Files changed: `backend/cloudfiles/providers/google_drive.py`, `backend/cloudfiles/views.py`,
`backend/tests/cloudfiles/test_tasks.py`, `backend/tests/cloudfiles/test_views.py` (+130 / −20)

---

## Verdict
Correct, no blocking issues. Minor test and style findings below.

---

## Checked Against Rules

| Check | Result |
|---|---|
| Hardcoded API keys | None. Client ID/secret still come from `get_dynamic_setting`. |
| Rule 4 (OAuth tokens in POST body, not URL) | Not affected; `revoke_token` still uses `data=`. |
| Rule 3 (guard transitions + TDD) | New tests would fail on the old code. Test-first order cannot be verified from the diff. |
| Input validation | N/A (internal provider/callback logic). |
| camelCase rule | N/A for Python; project uses PEP 8 `snake_case`, and the new code follows it. |
| Naive/aware datetime handling | Correct: naive UTC passed to `Credentials`, converted back to aware before persisting. |

---

## Findings

### 1. Test imports inside functions (minor, style)
`test_google_drive_proactively_refreshes_expired_token` and `test_google_drive_upload_file_handles_refresh_error`
in `backend/tests/cloudfiles/test_tasks.py` import `timedelta`, `timezone`, `BytesIO`, `RefreshError`, and
`GoogleDriveProvider` inside the test bodies. `BytesIO` is already imported at the top of the file.
AGENTS.md requires imports at the head of files unless a circular import forces deferral.

### 2. Refresh test does not cover the persistence fix (minor)
`fake_refresh` is a no-op, so `creds.expiry` never changes and the "make refreshed expiry timezone-aware
before saving" branch is never exercised. The `client` variable is unused.
**Suggested fix:** have `fake_refresh` set `creds.token` and `creds.expiry` (naive, in the future), then assert
`cloud_connection.expires_at` is aware and updated.

### 3. Reconnect preservation applies to all providers (note)
`CloudCallbackView` is shared by every provider, so omitting `refresh_token` from `defaults` also changes
Dropbox and Nextcloud. This is probably intended (`refresh_token` is `null=True`, and first connect still
works), but a provider that deliberately returns no refresh token could keep a stale one.
Consider a per-provider test.

### 4. `expires_at=None` after reconnect (note)
If the callback response has no `expires_at`, the old expiry is cleared while the existing refresh token is
kept. The next call refreshes, so this is safe, but worth knowing.

### 5. Duplicated error message (nit)
The long "Failed to access Google Drive. Your authorization token may have expired or been revoked. Please
reconnect your account." string now appears in both `_get_client` and `_handle_provider_error`.
Consider a constant or raising through the handler.

---

## Proposed Additions to Long-Term Memory (pending approval)

[ ] Issue: Tests for new persistence logic mocked `Credentials.refresh` as a no-op, so the "persist refreshed
expiry as timezone-aware" branch had no coverage. Tests also imported modules inside functions without a
circular-import reason.
Prevention Rule: When mocking an OAuth `refresh()`, make the fake set `creds.token` and `creds.expiry`, and
assert what gets persisted (including timezone-awareness). Put test imports at the top of the file unless a
circular import forces otherwise.

[ ] Issue: The shared cloud OAuth callback view (`CloudCallbackView`) writes provider token data directly to
`CloudConnection`, so fixes made for Google affect every provider.
Prevention Rule: When changing `CloudCallbackView` defaults, add or check tests for each provider (Dropbox,
Nextcloud), not just Google Drive.

> Not yet appended to `docs/tech_stack_guidelines.md`; awaiting explicit approval.
