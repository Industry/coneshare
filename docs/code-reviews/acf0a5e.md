# Code Review: `acf0a5e` (PR #363, banner gallery and brand logo override)

- **Date:** 2026-10-15
- **PR:** https://github.com/coneshare/coneshare/pull/363
- **Branch:** `feat.dataroom_banner_gallery` -> `main`
- **Scope:** Full backend diff reviewed against `docs/tech_stack_guidelines.md` (Rules 1-7) and AGENTS.md. Frontend was not reviewed in depth; only confirmed all five locale catalogs were touched (Rule 7).

## Must fix
1. **The SVG sanitizer is bypassable.** See `sanitize_svg_content` in `backend/datarooms/utils.py`.
   - It uses a blocklist, and the stdlib `xml.etree` parser is not safe against entity-expansion attacks. The docstring claims XXE protection, but the code doesn't provide it.
   - It misses vectors such as `<animate>`/`<set>` targeting `href`, `<style>` with `@import` or `url()`, and external `<image href>`.
   - The `javascript:` check is a substring match, so character-reference obfuscation can slip past it.
   - Uploaded SVGs are served from `SITE_DOMAIN`, so a successful bypass is stored XSS on the app origin.
   - **Fix:** use an allowlist sanitizer with a hardened parser (`defusedxml`, or `nh3`/`bleach`), or drop SVG support. Serve logos with `Content-Disposition`, a restrictive CSP, or `X-Content-Type-Options: nosniff`.
2. **Logo files are never checked for real content.** `brand_logo_override` is a `FileField`. Only the extension is checked, so a non-image file named `.png` is accepted. Use `ImageField` for non-SVG logos.

## Should fix
3. **The 10-image limit and the next position are racy.** `banner_images` does `count()`, then `max(position)`, then `save` with no lock (Rule 1). Use `transaction.atomic()` with `select_for_update()` on the dataroom.
4. **The logo is deleted before the replacement is saved.** If the save fails, the logo is lost. Delete the old file in `transaction.on_commit`.
5. **`banner_image_detail` can return a 500 on a malformed ID.** `filter(id=banner_id)` on a non-UUID string raises `ValidationError`, assuming `BaseModel.id` is a UUID.
6. **Permission checks are inconsistent.** The viewset uses `is_dataroom_owner_or_admin`, but the serializer `validate` uses `user.role == 'admin'` and `created_by_id`. This could allow cross-organization admin edits.
7. **Numeric fields have no upper bound (Rule 6).** `position` has no `max_value` in either serializer, so an oversized value hits a DB integer overflow and a 500. Reorder also doesn't reject duplicate IDs or positions.
8. **Imports in `sanitize_svg_content` are placed inside the function.** AGENTS.md requires top-of-file imports unless there is a circular import, and there is none here.
9. **The model `help_text` disagrees with the allowed extensions.** It says WebP is supported, but the validator allows only png, jpg, jpeg and svg.

## Minor
- The banner and logo payload-building code is duplicated in two places in `sharelinks/views.py`. Extract a helper and use `prefetch_related('banner_images')`.
- `brand_logo_override` is exposed to viewers even when `logo_mode == 'org'`. Only expose the resolved URL.
- `'override'` in `_resolve_dataroom_brand_logo_url` doesn't match any defined mode.
- Deleting a dataroom cascades the gallery rows but leaves the image files on storage.
- The PR edits `.agent/memory.md`. AGENTS.md requires explicit user consent for memory changes, so confirm that edit is intended.

## Passed
- No hardcoded secrets.
- File-size limits are enforced for gallery images and logos.
- Owner and admin gating is present on the write endpoints.
- i18n is complete across all five locales.
- Tests are added for backend and frontend.

## Proposed memory additions (pending approval, not yet written to `tech_stack_guidelines.md`)
- [ ] SVG uploads: never accept user SVGs without an allowlist sanitizer and a hardened parser (`defusedxml`). Otherwise reject SVG. Serve user uploads with `nosniff` and a CSP.
- [ ] Count-limited child creation must run in `transaction.atomic()` with `select_for_update()` on the parent (extends Rule 1).
- [ ] Delete replaced files via `transaction.on_commit` after a successful save. Give every client-supplied integer both `min_value` and `max_value` (extends Rule 6).
- [ ] Use one shared permission helper (`is_dataroom_owner_or_admin`) for both view and serializer checks.
