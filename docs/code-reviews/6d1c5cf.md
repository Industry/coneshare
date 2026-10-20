# Code Review — `6d1c5cf` *(code-reviewer skill + PR review comments)*
**feat(viewer): redesign dataroom customer view to match stitch mockup**

PR: https://github.com/coneshare/coneshare/pull/369
Plan: `plans/todo/dataroom_viewer_redesign_plan.md`

Scope: 29 files, +2438 / −416 (public dataroom serializers, share-link view data, `DataroomViewer.jsx` rewrite,
new hero/folder/featured/document-card components, watermark SVG tweaks, 6 locale catalogs, tests).

> Review status: 1 commit. Open PR. Merge state `unstable`.
> Sources: (A) local code-reviewer audit, (B) CodeRabbit review (`coderabbitai[bot]`, 2026-10-20 09:17 UTC;
> 5 inline threads, all unresolved, 1 nitpick) fetched via GitHub MCP.

---

## Verdict
CodeRabbit's merge-risk is **Moderate**. Two functional regressions (document Q&A trigger, NDA flag) should be fixed
before merge. The i18n and copy issues are smaller follow-ups.

---

## A. Local audit findings (code-reviewer)

1. **Hardcoded English strings (violates Rule 7).** `title="Featured"` in `DataroomViewer.jsx:111`,
   `DataroomFolderGrid.jsx:115`, `DataroomDocumentCard.jsx:62`; `aria-label={`Actions for ${…}`}` in
   `DataroomViewer.jsx:195` and `DataroomFolderGrid.jsx:144`; `aria-label="Interactive banner gallery"` and
   `` `Go to slide …` `` in `DataroomBannerGallery.jsx`.
2. **`viewer.loading` key missing in all 6 locale catalogs.** `DataroomViewer.jsx:1539` calls
   `t('viewer.loading')` with no default.
3. **Public `is_starred` exposure is under-tested.** Only the `False` default is asserted. Add a `True` case
   and a test on the `ShareLinkViewDataView` payload (`updated_at`).
4. **Inconsistent `updated_at` serialization in `sharelinks/views.py`.** One branch uses `.isoformat()`, the
   other passes the raw datetime.
5. **Folder card menu.** The "View" item is redundant with the card click. Confirm `allow_download` is
   re-checked server-side for the ZIP endpoint.
6. **Watermark SVG duplicated** in `PdfJsViewer`, `MarkdownViewer` and `SpreadsheetViewer`. Extract a shared helper.
   Verify no caller still passes the removed `title` prop to `PdfJsViewer`.
7. **localStorage access.** Wrap `getItem`/`setItem` for `coneshare_dataroom_view_mode` in try/catch.
8. **Housekeeping.** Move the plan out of `plans/todo/` (all phases are marked ✅).

## B. PR review comments (CodeRabbit)

### Should fix
| # | Severity | Location | Comment |
|---|---|---|---|
| B1 | 🟠 Major | `DataroomViewer.jsx:1014` ([thread](https://github.com/coneshare/coneshare/pull/369#discussion_r4323380385)) | `isQnaEnabled={false}` removes the only Q&A toggle while a document is open. The document-mode nav has only breadcrumbs and Prev/Next, so `handleQnaToggle` and `isDocQnaOpen` are unused. A visitor cannot ask about the open document even when `link_settings.enable_qna` is true. **Fix:** pass `isQnaEnabled={isDocActive && isQnaEnabled}`, `isQnaOpen={isDocQnaOpen}`, `onToggleQna={handleQnaToggle}`, `qnaButtonLabel={currentScopeQnaButtonLabel}`. |
| B2 | 🟡 Minor | `DataroomViewer.jsx:993-995` ([thread](https://github.com/coneshare/coneshare/pull/369#discussion_r4323380366)) | `isNdaProtected` reads `publicMeta?.is_nda_bound`, but the public-meta payload provides `require_nda`. NDA badges can stay hidden. **Fix:** read `publicMeta?.require_nda`. |
| B3 | 🟡 Minor | `DataroomDefaultHeroBanner.jsx:75-87` ([thread](https://github.com/coneshare/coneshare/pull/369#discussion_r4323380353)) | The view-data response has no `description`, so every default hero shows invented text ("architecture blueprints, third-party audit reports, enterprise diligence commitments"). `RESTRICTED CONFIDENTIAL` is hardcoded, untranslated and always shown. **Fix:** render the description only when non-empty, and show the confidential tag only when the link settings say so, via i18n. |

### Minor
| # | Severity | Location | Comment |
|---|---|---|---|
| B4 | 🟡 Minor | `locales/ru/translation.json:41` ([thread](https://github.com/coneshare/coneshare/pull/369#discussion_r4323380403)) | `common.showAllFolders` has only the "many" form ("папок"). Counts like 21–24 and 32 are grammatically wrong. **Fix:** add `_one` / `_few` / `_many` / `_other`, as `threadsCount_*` does. |
| B5 | 🟡 Minor | `plans/todo/dataroom_viewer_redesign_plan.md:50-53` ([thread](https://github.com/coneshare/coneshare/pull/369#discussion_r4323380409)) | The plan has absolute `file:///Users/xiez/...` links (also at lines 58, 64, 70-72, 77, 91). **Fix:** use repo-relative links such as `../../frontend/src/components/viewer/DataroomViewer.jsx`. |

### Nitpick
- **B6 🔵 Trivial** — `DataroomFeaturedGrid.jsx:14-29`: `getDocumentBadgeStyle` is copy-pasted in `DataroomFeaturedGrid`,
  `DataroomDocumentCard` and `DataroomViewer` (lines 59-74). Move it to one shared helper next to `FileTypeIcon`.

### PR-level summary (CodeRabbit)
- Pre-merge checks: 4 passed, 1 warning. Docstring coverage is 25% against an 80% threshold, which is advisory.
- Change assessment: Feature, complexity 4, about 45 min review.

---

## Proposed Additions to Long-Term Memory
*Pending user approval; not yet appended to `docs/tech_stack_guidelines.md`.*

- [ ] Issue: Hardcoded `title`/`aria-label` strings and a `t()` call without a catalog entry shipped in the viewer redesign.
  Prevention Rule: Extend Rule 7 to `title=`, `aria-label=` and `placeholder=`. Run a locale key-parity check across all 6 catalogs before committing.
- [ ] Issue: New public serializer and share-link payload fields were only tested with default values.
  Prevention Rule: Test truthy and falsy values and the view response itself for every new public payload field.
- [ ] Issue (from B1): A redesign removed the document Q&A trigger and left its handlers unused.
  Prevention Rule: When rewriting a viewer layout, list the existing interactive features (Q&A, download, NDA, watermark) and confirm each still has a trigger. Treat unused handlers as a regression signal.
- [ ] Issue (from B2): The frontend read a non-existent payload key (`is_nda_bound` instead of `require_nda`).
  Prevention Rule: When consuming `publicMeta` fields, verify the key against the backend serializer or view and add a test using the real payload shape.
- [ ] Issue (from B4): Russian plural forms were missing for a count-based key.
  Prevention Rule: Count-interpolated keys need CLDR plural variants in `ru` (`_one`, `_few`, `_many`, `_other`).
