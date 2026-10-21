# Code Review — staged changes *(code-reviewer skill)*
**Gate pages redesign (Password / Email / NDA / error screens) with shared `GateLayout`**

Date: 2026-10-21 · Base: `main` @ `5b5de76` (staged, not yet committed)
Plan/Docs: `docs/tech_stack_guidelines.md` (Rules 1–7)

Scope: 19 staged files, +683 / −358
- `frontend/src/components/viewer/GateLayout.jsx` (new shared layout)
- `PasswordForm.jsx`, `EmailForm.jsx`, `NDAForm.jsx`, `AccessOwnerCard.jsx` (moved onto `GateLayout`)
- `frontend/src/pages/ShareLinkViewerPage.jsx` (error screen uses `GateLayout`)
- `frontend/src/index.css` (`.gate-dot-pattern`, `.nda-scroll`)
- 6 locale catalogs (+23 keys each), tests (`GateLayout.test.jsx` new; Email/NDA/Password updated),
  `vitest.whitelist.json`, `vitest.whitelist.config.js` (`testTimeout: 10000`)

> Verification: `npx eslint` is clean on the touched components and on `ShareLinkViewerPage.jsx`. Tests and the app were not run.
> The untracked `plans/todo/dataroom_extensible_action_button_and_protected_tabs_plan.md` is not staged (docs only).

---

## Verdict
A sound refactor with no security regressions. The three gates share one layout, locale parity holds (+23 keys in each of
the 6 locales), and no hardcoded keys appeared. Nothing blocks the commit, but the i18n and UX issues below are worth
fixing first.

## What Checks Out
- No hardcoded API keys. The forms keep `required` on their inputs.
- New names are camelCase. Imports are at the head of the files.
- `PasswordInput` exists in `components/ui`. `viewer.continue` and `viewer.verifying` already exist in the catalogs.
- `ndaText` is rendered as text (`whitespace-pre-line`), so there is no HTML injection.

---

## Findings

### Should fix
1. **Dead i18n keys in all 6 locales.** 11 of the 23 added keys have no consumer: `securePortalAccess`, `noPasswordPrompt`,
   `enterPasswordPlaceholder`, `resendEmail`, `corporateDiligence`, `stateEmailInput`, `initialVisitorPrompt`,
   `stateScannerSafe`, `securityScannerSafe`, `confidentialityNdaTitle`, `disclosingParty`. They look like mockup-state
   labels. `PasswordForm` still uses `viewer.enterPassword`, not `enterPasswordPlaceholder`.
   **Fix:** remove them from all locales, or wire them up.
2. **Hardcoded English in the new layout (Rule 7).** `GateLayout.jsx` uses `alt={`${displayBrandName} Logo`}`.
   `AccessOwnerCard.jsx` uses `alt={ownerName || 'Owner'}`. `NDAForm.jsx` falls back to
   `'Non-Disclosure Agreement terms go here.'` when `nda_text` is empty, so a visitor can accept a placeholder NDA.
   **Fix:** use `t()` for the alt text. For the NDA, block the accept button and show an error state when the body is
   missing, with a test.
3. **Misleading decline link.** `NDAForm` renders "Decline terms and return to sender" as a plain link to
   `brandWebsiteUrl`. It sends the visitor to the brand site, not back to the sender, and records no decline.
   **Fix:** rename it ("Decline and leave"), or implement a real decline.

### Minor
4. **Two logo sources in one layout.** The top bar uses `brandLogoUrl`, while the card header uses
   `publicMeta.resolved_brand_logo_url`. Both show brand name and logo, so branding repeats on the page. Pick one.
   `resolved_brand_logo_url` goes into `<img src>` unchecked (see `isSafeUrl`, as noted for PR #370).
5. **Two `<h1>` elements on the error screen.** `GateLayout` renders an `<h1>` for the brand, and the new "Link Error"
   screen adds a second one. Make the brand name a `<p>` or `<span>`.
6. **Raw `error.message` shown** on the error screen. `NDAForm` and `EmailForm` already use `getLocalizedErrorMessage`.
   Do the same here.
7. **Fixed hex colours and custom CSS.** `bg-[#111827]`, `bg-[#F9FAFB]` and so on, plus `.gate-dot-pattern` and `.nda-scroll`
   in `index.css`. Prefer theme tokens. The `.dark` selectors depend on the dark class being set on an ancestor.
8. **Global `testTimeout: 10000`** in `vitest.whitelist.config.js`. It can hide slow tests. Scope it to the slow test with a
   per-test timeout, or explain why it is needed.
9. **Silent `catch {}` in `PasswordForm.jsx`.** The old comment saying the global interceptor shows the error toast was
   dropped. Restore it.
10. **Test depth.** `GateLayout.test.jsx` covers the layout props. There is no test for the empty `nda_text` case or the
    error screen.

---

## Proposed Additions to Long-Term Memory
*Pending user approval; not yet appended to `docs/tech_stack_guidelines.md`.*

- [ ] Issue: 11 of the 23 new i18n keys were added to all 6 locales but never used, because mockup-state labels were
  copied in bulk.
  Prevention Rule: Before committing a locale change, check that every added key has a `t()` caller (for example
  `grep -rn "viewer.<key>" src`). Remove unused keys, and keep the 6 locales in step.
- [ ] Issue: The NDA gate falls back to a hardcoded English placeholder ("Non-Disclosure Agreement terms go here.") when
  `nda_text` is empty, so a visitor can accept a placeholder NDA.
  Prevention Rule: Legal or consent gates must never show placeholder text. Block the accept action and show an error
  state when the agreement body is missing, and add a test for that case.
