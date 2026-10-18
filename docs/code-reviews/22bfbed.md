# Code Review — `22bfbed` *(code-reviewer skill)*
**feat(documents): client-side markdown preview and reading analytics (#356)**

PR: https://github.com/coneshare/coneshare/pull/359
Plan: `plans/todo/markdown_preview_plan.md`

Scope: 27 files, +1265 / −55 (backend renderer/services/views, `PageView.scroll_percentage`,
`MarkdownViewer.jsx`, viewer integrations, analytics chart, tests).

> Known/accepted: the Django migration for `PageView.scroll_percentage` is not in this commit; the maintainer
> will add it later (per project policy, agents do not generate migrations).

---

## Verdict
Implementation matches the plan closely. Two findings should be fixed before merge; the rest are minor.

## What Checks Out
- No hardcoded secrets.
- XSS: DOMPurify allow-list + `isSafeUrl` on `href`/`img.src` (trims whitespace, strips control chars, blocks
  `//`); hooks added/removed in `try/finally`.
- Telemetry uses `sendBeacon` / `fetch keepalive`.
- `enqueue_render_task` never queues Celery work; flush on unmount and unload.
- camelCase respected in JS.

---

## Findings

### Should fix
1. **Persisted `download_only` defeats the dynamic size limit.**
   `MarkdownRenderer.is_dynamically_previewable` uses `doc.download_only or doc.is_download_only`.
   `initialize_metadata` writes `document.download_only = is_too_large` at upload, so raising
   `MAX_PREVIEW_FILE_SIZE_MB` later will not re-enable large `.md` files. This contradicts the plan's
   "Dynamic Limit Adjustment" checkbox and the 2026-07-21 memory decision.
   **Fix:** use only `doc.is_download_only`; add a regression test that raises the limit after upload.

2. **`scroll_percentage` has no 0–100 validation.**
   `PageViewRecordSerializer` accepts up to 32767 (`PositiveSmallIntegerField`), so analytics can show
   "Read 32767%". `completion_rate` is clamped server-side, but the raw value reaches `PageViewsChart`.
   **Fix:** `extra_kwargs = {'scroll_percentage': {'min_value': 0, 'max_value': 100}}` (or a model validator)
   plus a test posting 101 → 400.

### Minor
3. **Missing scroll value → 100% completion.** In `RecordPageView`, a Markdown doc with
   `scroll_percentage=None` takes the `else` branch; with `num_pages=1`, any heartbeat sets
   `completion_rate = 1.0`.
4. **Scroll depth can be lost.** `sendTrackingData` returns when `duration < 1`; scrolling further after the last
   flush and leaving within a second drops the new maximum.
5. **New i18n keys lack translations.** `viewer.loadingMarkdown`, `viewer.previewFailed`, `errors.parseFailed`,
   `errors.unsupportedFormat`, `errors.notFound`, `viewSessions.document`, `viewSessions.readingDepth` exist only
   as in-code defaults (and `readingDepth` has two different defaults: "Read" vs "Read depth"). No locale-file
   entries found, so French users see English. The fetch error also shows raw `err.message`
   (2026-08-13 memory: route through `errorTranslator`).
6. **DOM clobbering via `id`.** `id` is in `ALLOWED_ATTR` (needed for anchors). Consider
   `SANITIZE_NAMED_PROPS: true` or prefixing ids.
7. **External images leak viewer IP.** `referrerpolicy="no-referrer"` hides the referrer only; remote images
   still contact third parties. Document as an accepted tradeoff in the plan if intended.
8. **Raw source exposed under protection.** `markdown_preview_url` returns the raw `.md` even when download is
   disabled or a watermark is on; `select-none`, `onCopy` blocking and the SVG overlay are bypassable in
   DevTools. Consistent with the video decision in memory; record as an accepted limitation in the plan.
9. **Test imports.** Confirm new backend tests keep imports at file top (AGENTS.md).

---

## Proposed Additions to Long-Term Memory
Approved by the user on 2026-10-07 and appended to `docs/tech_stack_guidelines.md` as Rules 5–7.

- [x] Rule 5 — Decide previewability only via `Document.is_download_only` + live setting.
- [x] Rule 6 — Explicit min/max validation for client-supplied numeric analytics fields.
- [x] Rule 7 — Add i18n keys to every locale catalog in the same change; one default per key.
