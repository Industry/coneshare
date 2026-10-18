# Code Review: `2e73d94` — PR #362

**PR:** https://github.com/coneshare/coneshare/pull/362
**Title:** fix(sharelinks): enforce sequential session authorization on page render endpoints
**Date:** 2026-10-12
**Files:** `backend/sharelinks/views.py`, `backend/tests/sharelinks/test_views.py`, `.agent/memory.md`

Reviewed against `/docs/tech_stack_guidelines.md` (Rules 1–7) and `.agent/memory.md`. Tests were not run.

## Overall
The refactor is sound. The new helper `_verify_share_link_session_authorization` replaces copy-pasted checks. Page and watermark endpoints now enforce password, email and NDA rather than only checking that a session exists. Preview sessions bypass the checks as before. No historical rules are violated.

## Findings

1. **Medium: partial pre-checks in accept-nda and request-access.**
   - `ShareLinkAcceptNDAView` only checks the password. The intended order is password, then email, then NDA.
   - A link with email and NDA protection lets an unverified-email session accept the NDA, recorded as an `NDAAcceptance` tied to an unverified email.
   - Fix: call the helper with a flag that skips the NDA step, or add the email check.
   - The rest of this view was not read, so a later email check is unconfirmed.

2. **Low: duplicated code.**
   - The password check is copy-pasted into both views instead of using the helper.
   - `ShareLinkAcceptNDAView` reads `authorized_links` and `auth_status` twice. The second read is redundant.

3. **Low: the NDA message depends on the status code.**
   - The helper chooses the NDA message with `if nda_status_code == 401`.
   - Fix: keep one message or pass it in explicitly.
   - The NDA status code also differs by endpoint: 401 for view-data, 403 for the page, watermark and download endpoints. Confirm this is intended.

4. **Low: test coverage.**
   - The 3 new tests cover only the 401 cases on the page and watermark endpoints.
   - Missing tests:
     - the download and folder-download views
     - the accept-nda and request-access pre-checks
     - the happy path, where the page is served after all checks pass
     - a preview session that bypasses the checks

5. **Style note.**
   - The code-reviewer skill asks for camelCase. `AGENTS.md` mandates PEP 8 `snake_case` for Python, and the code follows that. The repo rule takes precedence, so this is not a finding.

## General standards
- No hardcoded API keys.
- Input validation is unchanged (`ShareLinkEmailSerializer` is still used).

## Memory proposals
Declined by the user, so nothing was added to `tech_stack_guidelines.md`.
