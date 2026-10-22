---
name: Coneshare Portal & Dataroom Design System
colors:
  primary: "#111827"
  secondary: "#4B5563"
  tertiary: "#4F46E5"
  neutral: "#F9FAFB"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F9FAFB"
  border: "#E5E7EB"
  border-subtle: "#F3F4F6"
  accent-emerald: "#059669"
  accent-indigo: "#4F46E5"
  accent-amber: "#D97706"
  destructive: "#EF4444"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 700
    letterSpacing: "-0.025em"
  h2:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    letterSpacing: "-0.015em"
  h3:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
  mono-badge:
    fontFamily: JetBrains Mono, monospace
    fontSize: 0.6875rem
    fontWeight: 700
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

## Overview
Coneshare is a self-hosted B2B Virtual Dataroom and secure document sharing platform. Its visual identity blends **high-trust architectural clarity** with **curated customer portal presentation** (inspired by `portal/app/page.js`, Linear, and Notion Sites).
- **Not a Cloud Drive:** Datarooms are curated client portals, deal rooms, and company microsites—never style them like raw spreadsheet tables or Google Drive directory listings.
- **Layered Card Depth:** Use outer container cards (`rounded-2xl border border-gray-200 bg-gray-50/40 p-6 shadow-sm`) framing crisp inner content cards (`rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 transition`).
- **Subtle Hero Backdrop:** Optional radial dot-grid pattern (`radial-gradient(circle at 1px 1px, #d1d5db 1px, transparent 0)` at `20px 20px`) behind portal hero headers, fading smoothly into white.

## Colors
- **Primary (`#111827`):** Main headings, primary CTA buttons (`bg-gray-900 text-white hover:bg-gray-800 rounded-md`), and active navigation states.
- **Secondary (`#4B5563` & `#6B7280`):** Descriptions, relative timestamps, file sizes, and breadcrumb trails.
- **Background & Surface (`#FFFFFF` & `#F9FAFB`):** Pure white cards and content surfaces framed by `#F9FAFB` (`gray-50`) outer containers and `#E5E7EB` (`1px solid gray-200`) borders.
- **Semantic Status & Scope Pills:**
  - **Neutral / Index (`#F3F4F6` bg, `#4B5563` text):** Directory and file index tags (`01`, `02`, `DIR`, `PDF`, `VIDEO`).
  - **Emerald (`#ECFDF5` bg, `#065F46` text, `#A7F3D0` border):** Verified status, protected badges (`PROTECTED`), and engagement counters (`24 views`).
  - **Indigo (`#EEF2FF` bg, `#4338CA` text, `#C7D2FE` border):** Collaborator roles, NDA signed badges (`NDA Signed`), and watermark notices.
  - **Amber (`#FFFBEB` bg, `#B45309` text, `#FDE68A` border):** Owner role badge (`Owner`) and access gate notices (`Password Required`).
- **Dataroom Brand Presets:** `Default` (`#111827`), `Ocean` (`#0F4C81`), `Forest` (`#1F6F5F`), `Sunset` (`#B45309`), `Rose` (`#9F1239`), `Indigo` (`#3730A3`).

## Typography
- **Primary Font (`Inter`):** Clean, high-legibility sans-serif for all UI headings, body copy, tables, and controls.
  - `h1`: `1.875rem` (30px), `font-bold`, `tracking-tight` (`-0.025em`), color `#111827`.
  - `h2`: `1.25rem` (20px), `font-semibold`, `tracking-tight` (`-0.015em`), color `#111827`.
  - `h3`: `1rem` (16px), `font-semibold`, color `#111827`.
  - `body`: `0.875rem` (14px), `font-normal`, color `#4B5563`.
- **Monospace Font (`JetBrains Mono` / `font-mono`):** Used for index numbers (`01`, `02`), file type tags (`PDF`, `MD`), and security badges (`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded`).

## Iconography & FileTypeIcon Tokens
All icons strictly use **`lucide-react` (`2px` rounded stroke, `fill="none"`)** rather than solid yellow Windows/Drive folders, preserving a modern SaaS portal aesthetic and adapting cleanly to custom Dataroom brand presets:
- **Folder Icons (`Folder` / `FolderIcon`):**
  - **In Folder Cards:** Placed inside a `32×32px` (`h-8 w-8 rounded-lg`) soft-tinted container (`bg-gray-100` or `color-mix(in srgb, var(--dataroom-primary) 10%, transparent)`) with a `16×16px` (`h-4 w-4`) stroke icon in `var(--dataroom-primary)` / `#111827` (avoid solid yellow folder icons).
  - **In Trees & Compact Lists:** `20×20px` (`h-5 w-5`) stroke icon colored with `var(--dataroom-secondary)` (`#4B5563`) or `var(--viewer-accent)` (`#1F2937`).
- **Document Type Icons & Badges (`FileTypeIcon.jsx`):**
  - **PDF (`FileTextIcon`):** Icon `#B91C1C` (Red-700) • Badge `bg-rose-50 text-rose-700 border-rose-100`
  - **Document / Word (`FileIcon`):** Icon `#1D4ED8` (Blue-700) • Badge `bg-blue-50 text-blue-700 border-blue-100`
  - **Spreadsheet (`FileSpreadsheet`):** Icon `#15803D` (Green-700) • Badge `bg-emerald-50 text-emerald-700 border-emerald-100`
  - **Video (`FileVideo`):** Icon `#8A2BE2` (Violet) • Badge `bg-violet-50 text-violet-700 border-violet-100`
  - **Markdown (`FileCode`):** Icon `#0284C7` (Sky-600) • Badge `bg-sky-50 text-sky-700 border-sky-100`
  - **Image (`FileImageIcon`):** Icon `#0F766E` (Teal-700) • Badge `bg-teal-50 text-teal-700 border-teal-100`

## Components

### Surface A: External Visitor Portal (`/view/{slug}` — Customer View)
Visitors arrive via a ShareLink after passing sequential security gates (`Password` -> `Email / Magic Link` -> `One-Click NDA`).
- **Strict Read/Download Boundary:** Visitors **only** see items where `is_visible = true` (including visible ancestor folder paths). Never render upload buttons, rename/move actions, link settings, or owner columns.
- **Portal Hero Header:** Top bar with Dataroom/Org Logo, Portal Title, Language Picker, and contextual Q&A trigger (only shown when `link_settings.enable_qna = true`). Below sits the rounded Banner Card (`rounded-xl border border-gray-200 overflow-hidden`).
- **Curated Content Canvas (`max-w-6xl mx-auto`):**
  1. **Featured / Pinned Resources (`is_starred = true`):** 3-column highlight cards (`rounded-xl border border-gray-200 bg-white p-4 shadow-sm`) at the very top (above Folders) for starred files/folders that owners want customers to see first.
  2. **Folders (Compact 6-Card Cap):** Compact horizontal folder cards (`h-14 rounded-xl border border-gray-200 bg-white px-4 shadow-sm hover:border-gray-300`) in a 3-column grid (capped at 6 visible cards / 2 rows by default, with a `"Show all X folders ▾"` toggle when more than 6 folders exist so documents stay above the fold). Each card displays a sequential monospace index badge (`01`, `02`), a `32×32px` tinted rounded-lg icon container with a `lucide-react` stroke `Folder` icon, folder title, a `Download ZIP` button (only if `allow_download = true`), and a `Q&A` button (if `enable_qna = true`). Clicking a card navigates into that folder (`?parent_id=<folder_id>`), hides the root Hero Banner, updates the breadcrumb (`⌂ All Files › Folder Name`), and displays its subfolders and documents.
  3. **Documents List / Grid:** Clean resource cards or spacious rows (`px-4 py-3 border-b border-gray-100 hover:bg-gray-50`) with sequential monospace index badge (continuing cleanly after folders), FileTypeIcon (`pdf`, `video`, `spreadsheet`, `markdown`, `image`), document title, updated timestamp, file size, primary `View` action (opens inline SPA preview with collapsible `DataroomFileTree` sidebar), `Download` button (only if `allow_download = true`), and contextual `Q&A` slide-over drawer trigger.

### Surface B: Internal Dataroom Manager (`/datarooms/{id}` — Owner & Collaborator Builder)
Internal users (Owners, Collaborators, Org Admins) curate the dataroom and manage sharing.
- **Workspace Header:** Dataroom title, Role badge (`Owner` or `Collaborator`), Collaborators avatar stack (`+ Invite`), and primary builder buttons (`Create Folder`, `Add Content`, `Upload` dropdown `bg-gray-900 text-white rounded-md px-3 py-2`).
- **Management Tabs:**
  1. **Documents (WYSIWYG Portal Builder):** Mirrors the visitor's curated Portal layout (Hero Banner + Featured Resources + Folder Cards + Document Rows) so managers see how customers experience the room, augmented with builder controls:
     - Toolbar: Folder breadcrumb, `Starred` filter pill, `Reorder Items` button, and `Grid / List` view switcher. Contextual `SelectionActionBar` (`Move`, `Remove`, `Clear`) appears when items are checked.
     - Grouped Reordering (`DataroomReorderItemsDialog`): Separates ordering into two distinct groups matching the visual layout—**Folders Order** (top group) and **Documents Order** (bottom group)—concatenating `[...orderedFolders, ...orderedDocuments]` on save so index numbers remain strictly sequential (`01..N` for folders, `N+1..M` for documents). To promote specific files above all folders, managers simply toggle the item's **Star (`★`)** to pin it into the top **Featured Resources** block.
     - Item Controls: Selection checkbox, Star toggle (pins/unpins item to Featured Resources), monospace Index badge, View count badge (`18 views`), and `...` management menu (`Rename`, `Move`, `Remove`). Supports full-area drag-and-drop file/folder upload.
  2. **Links & Analytics:** 4-column KPI `Stats` cards, `LinksTable` (with `+ Create Link` sheet and granular per-item `ManagePermissionsDialog` for `is_visible`, `allow_download`, `enable_watermark`), and `ViewSessionsTable` activity log.
  3. **Q&A Moderation:** `OwnerQnAManager` filtered by share link, item context, and open/closed thread status.
  4. **Settings & Branding:** Organized settings cards for General Name, Custom Logo (`org` vs `dataroom`), Brand Color Presets, Banner Gallery (`single`, `gallery`, `none`), File Index & Q&A master switches, Storage Quota bar, and Danger Zone.
