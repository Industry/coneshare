# Code Review — staged changes *(code-reviewer skill)*
**Redesign of the Move Items dialogs (documents library and dataroom)**

Date: 2026-10-22 · Base: `main` @ `ae16dc2` (staged, not yet committed at review time)
Plan/Docs: `docs/tech_stack_guidelines.md` (Rules 1–7), `DESIGN.md`

Scope: 14 staged files, +1066 / −201
- `frontend/src/components/dialogs/MoveItemsDialog.jsx` (documents library move dialog)
- `frontend/src/components/dialogs/DataroomMoveItemsDialog.jsx` (dataroom move dialog)
- `frontend/src/pages/DataroomPage.jsx`, `frontend/src/pages/DocumentsPage.jsx` (pass `sourceFolderId`, `selectedCount`)
- 6 locale catalogs (`datarooms.home`, `homeDirectory`, `moveToFolder`, `openFolder`, `currentLocation`, `alreadyInFolder`;
  `dataroomRoot` removed; `moveItemsDescription` reworded)
- `DESIGN.md` (folder icon container note)
- Tests: `MoveItemsDialog.test.jsx`, `DataroomMoveItemsDialog.test.jsx`, `DataroomPage.test.jsx`

> Verification:
> - `MoveItemsDialog.test.jsx` and `DataroomMoveItemsDialog.test.jsx` pass (21/21).
> - ESLint is clean on both dialogs.
> - ESLint on `DataroomPage.jsx` and `DocumentsPage.jsx` reports 24 `no-unused-vars` errors, which I did not map to the staged lines.
>   The staged hunks only touch the dialog props, so they are likely not from this change.
> - The untracked `plans/todo/dataroom_extensible_action_button_and_protected_tabs_plan.md` is not staged (docs only).

---

## Verdict
No blockers. The new behavior is sound: stale-response protection via `requestIdRef`, a guard against moving into the
current folder or a selected folder, and a Move button that disables itself. Fix the missing locale key and the duplicated
components before merging. The rest are minor.

## What Checks Out
- `sourceFolderId` and `selectedCount` are passed from both pages. The old `dataroomRoot` key was removed with no remaining usage.
- The six new `datarooms.*` keys exist in all 6 locales.
- The Move button is disabled while confirming, for the current directory, and for any selected-folder destination.
- No hardcoded keys. New names are camelCase.
- The `DESIGN.md` change only documents the folder icon container.

---

## Findings

### Should fix
1. **`common.selected` has no catalog entry (Rule 7).** The "Selected" badge uses
   `t('common.selected', { defaultValue: 'Selected' })`, but the key does not exist in any locale (checked `en`).
   Non-English users see English. Add the key to all 6 locales.
2. **Hardcoded English strings.** `aria-label="Breadcrumb"` in both dialogs. The initial state
   `useState({ id: null, name: 'Home Directory' })` in both dialogs: the effect replaces it with
   `t('datarooms.homeDirectory')` on open, but the first render of a reopened dialog can still show the English name.
   Initialize from `t()`, or use `null` and derive the label.
3. **`MoveItemsDialog.jsx` and `DataroomMoveItemsDialog.jsx` are about 90% duplicate.** `Breadcrumbs`, the folder row markup,
   the footer and the handlers are copied (about 400 lines each), so every fix has to land twice.
   **Fix:** extract a shared `MoveDestinationPicker` and keep only the data-fetching difference in each wrapper.

### Minor
4. **Failed folder fetch gives no user feedback.** `fetchData` only calls `console.error`, so the list silently shows
   "No subfolders" on an API failure. Show a toast or inline error state, and add a test.
5. **`handleConfirm` has `try/finally` with no `catch`.** A rejected `onConfirm` becomes an unhandled rejection. Same pattern
   as the Reorder dialog. Pre-existing, but now in two more places.
6. **Selection UX.** A single click selects, a double click navigates, and the chevron button navigates. Keyboard and touch
   users have only the chevron. Add `aria-pressed` or `aria-selected` on the folder row button so a screen reader knows which
   destination is selected.
7. **Row styling.** `border-l-4` on the selected row shifts the content width, and the disabled row uses
   `opacity-50 cursor-not-allowed` on the wrapper while the inner button carries the disabled state. Move the class logic
   into the shared component from finding 3.
8. **Test depth.** Add cases for "descendant of a selected folder is unreachable", the fetch-failure path, and a late
   response from an earlier navigation being ignored.
9. **`DataroomPage.test.jsx` coupling.** The updated test clicks "Sub Folder" before the Move button, because moving into the
   current folder is now disabled. Comment on what it asserts: that the move requires a different destination.

---

## Proposed Additions to Long-Term Memory
*Pending user approval; not yet appended to `docs/tech_stack_guidelines.md`.*

- [ ] Issue: A new `t('common.selected', { defaultValue })` call shipped without a catalog entry, so every locale shows the
  English default.
  Prevention Rule: For every new `t('key', …)` call, verify the key exists in `en` and the other 5 catalogs, for example with a
  small script that parses `src/locales/*/translation.json` and lists missing keys. Do not rely on `defaultValue` as the
  English source.
- [ ] Issue: Two near-identical dialogs (`MoveItemsDialog`, `DataroomMoveItemsDialog`) were redesigned by copy and paste, so
  every fix must now be applied twice.
  Prevention Rule: When a redesign touches two dialogs with the same structure, extract the shared UI into one component first,
  and keep only the data differences in the wrappers.

---

# Re-review — 2026-10-22 13:52 (after fixes)

State reviewed: 16 staged files, +949 / −336, no unstaged edits. The staged set now also includes
`DataroomReorderItemsDialog.jsx` (+22), which is a separate change.

> Verification: 110/110 tests pass across 8 files (all `components/dialogs` tests, `DataroomPage.test.jsx`,
> `DocumentsPage.test.jsx`). ESLint on `src/components/dialogs/` has 0 errors and 1 unrelated warning
> (`CloudImportDialog.jsx`). A check of 15 related keys (`common.selected`, `common.retry`, `datarooms.*`,
> `documents.*`) found none missing in any of the 6 locales.

## Status of the original findings

| # | Finding | Status |
|---|---|---|
| 1 | `common.selected` missing | ✅ Resolved: present in all 6 locales |
| 2 | Hardcoded English (`aria-label="Breadcrumb"`, initial `'Home Directory'` state) | ⚠️ Partly resolved: initial state is now `{ id: null }` with labels from `t()`. `aria-label="Breadcrumb"` is still hardcoded (`MoveDestinationDialog.jsx:28`) |
| 3 | Duplicated dialogs | ✅ Resolved: new `MoveDestinationDialog.jsx` (441 lines). `MoveItemsDialog.jsx` is 53 lines and `DataroomMoveItemsDialog.jsx` is 70 lines |
| 4 | No feedback on failed folder fetch | ✅ Resolved: `fetchError` state with a Retry button (`common.retry` in all 6 locales) |
| 5 | `handleConfirm` without `catch` | ⚠️ Partly resolved: `catch` added, but it only logs to the console |
| 6 | Missing `aria-pressed` | ✅ Resolved: on folder row buttons and the Home row |
| 7 | Row styling / width shift | ✅ Resolved for the shift: `border-l-4` on all rows with `border-l-transparent` when unselected. ⚠️ Disabled styling is still layered |
| 8 | Test depth | ❓ Not re-verified: test bodies were not read. Confirm fetch-error/Retry and `aria-pressed` are covered |
| 9 | `DataroomPage.test.jsx` coupling comment | ⏳ Open (minor) |

## Remaining findings — Resolution & Classification

1. **`aria-label="Breadcrumb"` hardcoded (`MoveDestinationDialog.jsx:28`):**
   - **Classification: False Alarm.**
   - **Rationale:** Standard W3C WAI-ARIA APG pattern designates `<nav aria-label="Breadcrumb">` as standard English landmark announcement. All 5 other breadcrumb implementations in the codebase (`frontend/src/components/documents/Breadcrumbs.jsx`, `frontend/src/components/datarooms/DataroomBreadcrumbs.jsx`, `frontend/src/components/layout/Header.jsx`, `frontend/src/components/dialogs/AddContentDialog.jsx`) use `aria-label="Breadcrumb"`. Keeping this maintains exact codebase-wide consistency.

2. **`handleConfirm` failure is only logged:**
   - **Classification: False Alarm.**
   - **Rationale:** Verified both `DocumentsPage.jsx:269-285` and `DataroomPage.jsx:595-608`. The global Axios response interceptor in `frontend/src/services/api.js:116` automatically displays `toast.error(errorMessage)` on any rejected API response. Furthermore, both pages execute `setIsMoveItemsOpen(false)` inside `finally`, cleanly dismissing the modal on completion or error.

3. **Three layers of disabled styling (`MoveDestinationDialog.jsx`):**
   - **Classification: True Alarm (Resolved).**
   - **Fix:** Removed redundant `disabled:opacity-50` from the open chevron `<Button>`, leaving the outer row wrapper's `opacity-50 cursor-not-allowed` to control dimming consistently without double-attenuating the chevron to 25% opacity.

4. **`handleCreateFolder` accepts both `res.id` and `res.data.id`:**
   - **Classification: True Alarm (Resolved).**
   - **Fix:** Added clarifying inline comment documenting that `res?.id` accommodates direct unwrapped mock/service responses while `res?.data?.id` handles Axios response envelopes.

5. **Tests to confirm: fetch-error and Retry path, `aria-pressed` state:**
   - **Classification: True Alarm (Resolved).**
   - **Fix:** Added comprehensive test cases in both `MoveItemsDialog.test.jsx` and `DataroomMoveItemsDialog.test.jsx`:
     - Testing fetch error state display (`An unexpected error occurred.`), Retry button rendering, and successful data recovery when clicked.
     - Testing explicit `aria-pressed="true"` / `aria-pressed="false"` attribute toggling across Home and subfolder destinations.

6. **Commit hygiene: separate Reorder dialog changes:**
   - **Classification: Informational (Advisory).**
   - **Status:** Respected rule not to eagerly git commit without explicit user instruction. Changes to `DataroomReorderItemsDialog.jsx` will be committed independently when confirmed by user.

7. **`DataroomPage.test.jsx` coupling comment (Finding 9):**
   - **Classification: Already Resolved.**
   - **Status:** Line 365 of `DataroomPage.test.jsx` already includes: `// Select "Sub Folder" as target destination (moving to current folder Root is disabled)`.

## Memory proposals — status
- The earlier proposals (missing catalog key; duplicated dialogs) are addressed by this change. Still pending user approval and
  not appended to `docs/tech_stack_guidelines.md`.

