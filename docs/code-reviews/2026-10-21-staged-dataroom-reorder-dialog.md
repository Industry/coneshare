# Code Review — staged changes *(code-reviewer skill)*
**Dataroom "Reorder Items" dialog redesign (folders and documents sections)**

Date: 2026-10-21 · Base: `feat.redesign_dataroom_gate` @ `b81ccb0` (staged, not yet committed at review time)
Plan/Docs: `docs/tech_stack_guidelines.md` (Rules 1–7)

Scope: 9 staged files, +509 / −92
- `frontend/src/components/dialogs/DataroomReorderItemsDialog.jsx` (folders/documents sections, move up/down buttons, footer)
- `frontend/src/pages/DataroomPage.jsx` (`reorderableItems` now carries `document_type`, `file_size`, `updated_at`)
- 6 locale catalogs (`datarooms.*` keys: `foldersOrder`, `documentsOrder`, `*OrderHint`, `cardPosition`, `countFolders_*`, `countDocuments_*`)
- `frontend/src/tests/components/dialogs/DataroomReorderItemsDialog.test.jsx` (+157)

> Verification: ESLint and tests were not run. Locale parity was checked against the staged blobs.
> The untracked `plans/todo/dataroom_extensible_action_button_and_protected_tabs_plan.md` is not staged (docs only).
> Note: commit `15e9446` (fixed topbar for share link and dataroom viewers) is a different change and is not covered by this review.

---

## Verdict
No blockers. The dialog logic is unchanged and still correct, and the six locales are in step. Sort out the staged/unstaged
divergence before committing. The other issues are minor.

## What Checks Out
- All 6 locales contain every new `datarooms.*` key. Russian has proper `_one`, `_few`, `_many` and `_other` plurals.
- Each move button gives a keyboard alternative to drag-and-drop.
- `isSaving` blocks drags, drops and closing the dialog.
- The staged test file is whitelisted in `vitest.whitelist.json`.
- No hardcoded keys. New names are camelCase.
- The `DataroomPage.jsx` change adds only fields the items already carry.

---

## Findings

### Should fix
1. **Staged and unstaged changes diverge (status `MM`).** The working tree differs from the index in 8 files: it removes the
   folder and document header icon badges, drops the `documentsOrderHint` string, and rewrites `reorderDescription`
   ("Set custom display positions for folders and documents in {{scope}}.") and `reorderScopeRoot` ("Dataroom Home").
   Committing only the index ships the older design, with a test that expects the old hint.
   **Fix:** `git add -p` the second round of edits, or decide which version to ship, so the reviewed diff matches what ships.
2. **Hardcoded English strings (Rule 7).** `DataroomReorderItemsDialog.jsx` contains `title="Drag to reorder"`,
   `aria-label="Folders list"`, `aria-label="Documents list"` and `` aria-label={`Move ${name} up`} `` / `` ...down ``.
   They are untranslated in all 6 locales.

### Minor
3. **`t()` defaults duplicate catalog text** (`Dictates Left-to-Right grid card order`, `Card Position #…`). Rule 7 asks for one
   default per key. Drop the duplicated defaults now that the keys exist in every catalog.
4. **Plural keys for other languages.** `countFolders_*` and `countDocuments_*` use `_one`/`_other` for `de`, `fr`, `nl`.
   French needs a `_many` form in newer i18next CLDR rules for large counts. `zh-hans` has no plural distinction, so check
   which suffix it needs.
5. **Items effect resets in-progress ordering.** `useEffect` depends on `[isOpen, items]`. A new `items` reference while the
   dialog is open (for example a background refetch) silently resets the user's reordering. Pre-existing, but easier to hit now.
   Consider resetting only when `isOpen` flips to true.
6. **`handleSave` has `try/finally` with no `catch`.** A rejected `onConfirm` becomes an unhandled rejection and the dialog shows
   no error. Pre-existing. Show a toast or inline error.
7. **Duplicated row markup and long class strings.** The folder and document rows repeat the same `slate`/`zinc` classes.
   Consider a small `ReorderRow` sub-component.
8. **Test depth.** Add a test that the move-up and move-down buttons call `onConfirm` with the new order, and one for the
   `isSaving` lock.

---

## Proposed Additions to Long-Term Memory
*Pending user approval; not yet appended to `docs/tech_stack_guidelines.md`.*

- [ ] Issue: A redesign was staged in two rounds, so the index and working tree diverged. The staged test and the unstaged
  test describe different UI.
  Prevention Rule: Before running `/code-reviewer` or committing, make sure `git status` shows no `MM` files. Stage everything
  for the change, or stash unrelated edits, so the reviewed diff matches what will ship.
- [ ] Issue: Accessibility labels (`title="Drag to reorder"`, `aria-label="Folders list"`, `Move … up`) were again hardcoded
  in English in a new dialog.
  Prevention Rule: Extend Rule 7: every `title`, `aria-label` and `placeholder` string in a component must go through `t()`
  with a key in all 6 locales. Grep for `aria-label="` and `title="` on changed files before committing.
