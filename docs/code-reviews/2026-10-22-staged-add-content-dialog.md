# Code Review — staged changes *(code-reviewer skill)*
**Redesign of `AddContentDialog` (Add Content to Dataroom)**

Date: 2026-10-22 · Base: `main` @ `9b30715` (staged, not yet committed at review time)
Plan/Docs: `docs/tech_stack_guidelines.md` (Rules 1–7), `DESIGN.md`

Scope: 10 staged files, +548 / −117
- `frontend/src/components/dialogs/AddContentDialog.jsx` (redesigned dialog with search filter, breadcrumbs, error/retry, stale-response guard, and clear selection)
- `frontend/src/components/documents/FileTypeIcon.jsx` (`getDocumentBadgeStyle` image condition)
- 6 locale catalogs (`datarooms.filterCurrentList` added to `de`, `en`, `fr`, `nl`, `ru`, `zh-hans`)
- `frontend/src/tests/components/dialogs/AddContentDialog.test.jsx` (7 unit tests)
- `frontend/vitest.whitelist.json` (registered `AddContentDialog.test.jsx`)

> Verification:
> - `AddContentDialog.test.jsx` passes (7/7 tests in `2.32s`).
> - ESLint on `AddContentDialog.jsx` and `AddContentDialog.test.jsx` has 0 errors and 0 warnings.
> - ESLint on `FileTypeIcon.jsx` reports 1 error (`react-refresh/only-export-components` on `getDocumentBadgeStyle`).
> - All 17 translation keys referenced in `AddContentDialog.jsx` were verified across all 6 locale catalogs (`de`, `en`, `fr`, `nl`, `ru`, `zh-hans`) with 0 missing entries.

---

## Verdict
No blockers. The redesigned `AddContentDialog` cleanly handles folder navigation, stale-response protection via `requestIdRef`, fetch-error recovery (`Retry`), real-time client-side filtering, and multi-select state management. Address the `DESIGN.md` badge token mismatch in `FileTypeIcon.jsx` and the minor row click-target UX items before or alongside merging.

## What Checks Out
- **Stale-response protection:** `requestIdRef` prevents out-of-order responses from earlier folder navigations from overwriting current state (covered by unit test).
- **Error state & recovery:** Failed folder fetches surface an inline error state with a `Retry` button (`common.errorOccurred` + `common.retry`), covered by unit test.
- **Rule 7 (i18n completeness):** `datarooms.filterCurrentList` is added to all 6 locales, and all existing keys (`documents.selectedCount`, `documents.itemCount`, `datarooms.addSelectedItems`, etc.) are present in all 6 catalogs.
- **General standards:** No hardcoded secrets; all variables and handlers use `camelCase`.

---

## Findings

### Should fix
1. **Design token mismatch + missing Markdown badge in `getDocumentBadgeStyle` (`FileTypeIcon.jsx:107-125`).**
   - **Image badge color conflict:** Lines 112–114 style `image` badges with `bg-emerald-50 text-emerald-700 border-emerald-100/80` (colliding with `spreadsheet`). `DESIGN.md` (lines 91–94) specifies `emerald` for **Spreadsheet** (`#15803D`, `bg-emerald-50 text-emerald-700 border-emerald-100`) and **`teal`** for **Image** (`#0F766E`, `bg-teal-50 text-teal-700 border-teal-100`), matching the `#0f766e` (Teal-700) icon color in `FileTypeIcon`.
   - **Missing Markdown branch:** `getDocumentBadgeStyle` has no branch for `markdown` / `.md`, so Markdown documents fall through to the neutral gray default instead of `DESIGN.md`'s `bg-sky-50 text-sky-700 border-sky-100/80`.

### Minor
2. **Outer row click target dead-zone & missing double-click navigation (`AddContentDialog.jsx:247-345`).**
   - Folder rows (line 249) and document rows (line 309) apply `cursor-pointer` to the outer row `<div>`, but `onClick={() => handleItemSelect(...)}` is attached only to the inner text `<div className="truncate flex-1">` (lines 267, 327) and `<Checkbox>`. Clicking the `32×32px` icon container, the `updated_at` timestamp, or the row padding shows a pointer cursor without toggling selection.
   - Unlike `MoveDestinationDialog.jsx`, double-clicking a folder row does not navigate into the subfolder (users can only navigate via the right-hand `<ChevronRight>` button).
3. **Redundant click on active breadcrumb segment (`AddContentDialog.jsx:44-56`).**
   - In `Breadcrumbs`, the final item in `path` (`index === path.length - 1`, marked `aria-current="page"`) is rendered as an active `<button>` that calls `onNavigate(folder.id)`, re-fetching the current folder and clearing `searchQuery`. Render the active segment as a `<span>` (matching `MoveDestinationDialog.jsx:50-60`) or disable the button.
4. **ESLint `react-refresh/only-export-components` on `FileTypeIcon.jsx:107`.**
   - Exporting `getDocumentBadgeStyle` alongside the `FileTypeIcon` component triggers `react-refresh/only-export-components` when linting `FileTypeIcon.jsx` directly.
   - Also note untracked editor backup files (`frontend/src/pages/DataroomPage.jsx~` and `frontend/src/tests/pages/DataroomPage.test.jsx~`) in the working tree that should be removed before committing.
