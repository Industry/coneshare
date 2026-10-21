# Frontend Bundle Optimization & Code-Splitting Strategy

## Overview
This document outlines the architectural analysis, strategic decisions, and bundle-splitting patterns implemented to prevent monolithic frontend builds, reduce cold-start latency for public dataroom and document visitors, and maintain long-term caching efficiency across production deployments in ConeShare.

---

## 1. Problem Analysis & Root Cause

### 1.1 The Monolithic Entry Issue
Prior to optimization, Vite generated a single monolithic JavaScript bundle:
- `dist/assets/index-*.js`: **~2,939.78 kB uncompressed (~865.81 kB gzipped)**.
- Every public visitor accessing a shared link (e.g. `https://app.coneshare.com/view/:slug`) was forced to download the entire application bundle before the React tree could mount.

### 1.2 Module Size Breakdown
Running bundle analysis within the Docker frontend container revealed the following module distribution in the uncompressed bundle:

| Module Category | Primary Libraries | Rendered Size | Usage Context |
| :--- | :--- | :--- | :--- |
| **Application Source** | `src/pages/*`, `src/components/*` | **~1,505.72 KB** | All 30+ pages statically imported in `App.jsx` |
| **Video Streaming** | `hls.js` | **~1,275.54 KB** | HLS video playback (only needed for video documents) |
| **PDF Rendering** | `pdfjs-dist` | **~780.26 KB** | Client-side PDF rendering |
| **Charting Engine** | `recharts`, `d3-*`, `victory-vendor` | **~550.00 KB** | Analytics dashboards & Admin activity charts |
| **React Runtime** | `react-dom`, `react` | **~538.00 KB** | Core framework |
| **Date & Parsing Utilities** | `date-fns`, `dompurify`, `marked` | **~300.00 KB** | Localization, sanitization, markdown preview |
| **Drag & Drop** | `@dnd-kit/core`, `@dnd-kit/sortable` | **~60.00 KB** | Internal document & dataroom reordering |

### 1.3 Visitor Impact & Performance Bottlenecks
1. **Network Transfer Penalty**: Public visitors downloading ~866 kB of gzipped JS over cellular or high-latency networks experienced several seconds of initial blank screen.
2. **CPU Execution Block (Total Blocking Time / TBT)**: JavaScript engines (V8 / JavaScriptCore) must parse, compile, and execute 2.94 MB of code before mounting. On mobile devices, this created a 1.5–2.5 second main-thread freeze.
3. **Overfetching Waste**: Visitors browsing a public dataroom folder list never used Admin user management, automation workflows, link analytics charts, or drag-and-drop table sorters, yet 100% of those bytes were delivered upfront.

---

## 2. Architecture & Strategic Decisions

```mermaid
flowchart TD
    IndexHtml["index.html"] --> IndexEntry["index.js (~512 kB)\nShared UI, Providers, Layout"]
    IndexHtml --> VendorReact["vendor-react.js (~337 kB)\nReact, ReactDOM, React-Router\n(Long-Term Cacheable)"]

    subgraph PublicRoutes["Public Visitor Boundary (/view/:slug, /upload/:slug)"]
        IndexEntry -.->|React.lazy| ViewerPage["ShareLinkViewerPage.js (~39 kB)"]
        IndexEntry -.->|React.lazy| UploadPage["PublicUploadPage.js (~10 kB)"]
        ViewerPage -.->|Dynamic Import| VendorPdf["vendor-pdfjs.js (~409 kB)"]
        ViewerPage -.->|Dynamic Import| VendorHls["vendor-hls.js (~522 kB)"]
    end

    subgraph InternalRoutes["Authenticated App & Admin Boundary"]
        IndexEntry -.->|React.lazy| Dashboard["HomePage.js (with recharts ~315 kB)"]
        IndexEntry -.->|React.lazy| DataroomMgr["DataroomPage.js (with @dnd-kit ~70 kB)"]
        IndexEntry -.->|React.lazy| AdminPages["Admin*Pages (~5-20 kB each)"]
        IndexEntry -.->|React.lazy| Automations["AutomationsPage.js (~21 kB)"]
    end
```

### 2.1 Strategic Choices

| Decision Area | Choice | Rationale |
| :--- | :--- | :--- |
| **Route-Level Splitting** | `React.lazy()` + `<Suspense>` in `App.jsx` | Breaks static dependency graph at the page level. Ensures admin, automation, and analytics code is never loaded on visitor routes. |
| **Component-Level Viewer Lazy Loading** | `React.lazy()` for `PdfJsViewer`, `VideoViewer`, `MarkdownViewer`, `SpreadsheetViewer`, `PreviewViewer`, and `DataroomViewer` | Prevents `vendor-pdfjs` (410 kB), `vendor-hls` (523 kB), and `DataroomViewer` (52 kB) from downloading on initial gatekeeper or folder views before credentials are submitted or documents opened. |
| **Fallback Experience** | Global `<RouteLoadingFallback />` & Viewer `<Suspense>` | Provides smooth, non-blocking spinner transitions while lazily fetched route and viewer chunks load. |
| **Framework Chunking** | `vendor-react` via `manualChunks` | Isolates `react`, `react-dom`, and `react-router` into a standalone chunk with stable hashes across deployments for browser cache persistence. |
| **Heavy Dependency Isolation** | `vendor-pdfjs`, `vendor-hls`, `vendor-dndkit` | Isolates specialized heavy libraries so they are only requested when the relevant route or feature is loaded. |
| **Icon & UI Micro-Chunk Consolidation** | `vendor-icons` (`lucide-react`) & `vendor-ui` (`@radix-ui`) | Eliminates Rollup "Chunk Fragmentation" where 20+ separate <1KB icon chunks were generated, reducing initial HTTP requests from 29 to 13. |
| **Internal Shared UI Consolidation** | `shared-ui` in `manualChunks` | Explicitly groups `src/components/ui/`, `FileTypeIcon`, and `LanguagePicker` into a dedicated bundle, eliminating micro-chunks while avoiding Rollup route cross-contamination. |
| **Shared Utility Bleeding Prevention** | Avoid forcing shared utilities (`clsx`, `d3-*`, `es-toolkit`) into feature manual chunks | Prevents Rollup from creating circular cross-chunk dependencies that would trigger eager `<link rel="modulepreload">` tags in `index.html`. |

---

## 3. Rollup Manual Chunking Gotchas

> [!WARNING]
> **Gotcha 1: Avoid Module Bleeding into Feature Chunks**:
> When configuring `output.manualChunks(id)`, if a library like `recharts` depends on `d3-time-format` or `clsx`, and you group `d3-` into `vendor-recharts`, Rollup may place common utilities into `vendor-recharts`.
> If `index.js` also needs `clsx` or common formatting, `index.js` will statically import from `vendor-recharts`, which forces Vite to add `<link rel="modulepreload" href="vendor-recharts.js">` directly to `index.html`!
>
> **Best Practice**: Only match discrete, well-bounded top-level vendor directories (e.g., `node_modules/hls.js`, `node_modules/pdfjs-dist`, `node_modules/@dnd-kit`). Allow Rollup to naturally chunk internal feature dependencies (`recharts` inside `HomePage`) via route-level `React.lazy()`.

> [!WARNING]
> **Gotcha 2: Chunk Fragmentation from Cross-Route Shared Primitives**:
> When using `React.lazy` across multiple pages, any small dependency (such as individual icons from `lucide-react` or Radix UI components) referenced by more than one dynamic chunk will be split by Rollup into individual ~0.8KB micro-files. This causes browsers to dispatch 25–30+ HTTP requests on cold start.
>
> **Best Practice**: Explicitly consolidate frequently used design-system primitives into unified vendor chunks: `vendor-icons` for `lucide-react` and `vendor-ui` for `@radix-ui`. This collapses dozens of micro-requests into 2 cache-friendly bundles.

> [!WARNING]
> **Gotcha 3: Danger of `experimentalMinChunkSize` Merging Routes into Public Views**:
> Setting `output.experimentalMinChunkSize: 10000` causes Rollup to blindly merge small route chunks (<10KB, e.g. `PasswordSettingsPage` and `AdminLoginActivityPage`) with shared UI components (`Label`, `FileTypeIcon`).
> This caused public Dataroom visitors to download admin and settings code!
>
> **Best Practice**: Avoid `experimentalMinChunkSize` when any route chunks are smaller than the threshold. Instead, explicitly declare a `shared-ui` chunk in `manualChunks` to bundle shared components safely.

> [!WARNING]
> **Gotcha 4: Eager Dataroom Viewers on Protected Link Gates**:
> When `DataroomViewer` was statically imported in `ShareLinkViewerPage`, any visitor hitting a password, email, or NDA protected link immediately downloaded all Dataroom list grids, trees, banners, and viewer tools before entering credentials.
>
> **Best Practice**: Lazy-load `DataroomViewer` via `React.lazy()` wrapped in `<Suspense>`. Unauthenticated visitors only download the lightweight `PasswordForm` / `EmailForm` / `NDAForm` dialog, rendering the gate in <100ms.

---

## 4. Measured Results

All metrics were captured using the Docker frontend production build (`COMPOSE_PROJECT_NAME=coneshare docker-compose exec frontend npm run build`):

| Build Artifact / Metric | Before Optimization | Route & Vendor Splitting | Final (shared-ui & Gatekeeper Lazy) |
| :--- | :--- | :--- | :--- |
| **Main Entry (`index-*.js`)** | **2,939.78 kB** (865.81 kB gzip) | **692.06 kB** (217.59 kB gzip) | **511.67 kB** (157.54 kB gzip) |
| **Protected Gate Cold-Start Requests** | **1 monolithic request** (2.94 MB) | **13 requests** (~1.1 MB) | **5 requests** (~450 kB / 150 kB gzip) |
| **DataroomViewer Chunk** | Statically in main | Bundled in ShareLinkViewerPage (90 kB) | **Independent on-demand chunk** (52.6 kB) |
| **ShareLinkViewerPage Chunk** | Bundled in main | 90.41 kB (20.11 kB gzip) | **39.39 kB** (9.76 kB gzip) |
| **Admin Route Isolation** | Leaked in main | Leaked via minChunkSize | **100% Isolated** (0 admin bytes on visitor routes) |
| **React Runtime (`vendor-react-*.js`)** | Bundled in main | **337.57 kB** (106.45 kB gzip) | **337.57 kB** (106.45 kB gzip) |
| **Chart Engine (`recharts`)** | Bundled in main | **315.53 kB** (lazy chunk) | **315.06 kB** (lazy chunk) |
| **Drag & Drop (`@dnd-kit`)** | Bundled in main | Lazy chunk | Lazy chunk (0 kB for visitors) |
| **Total Test Suite Stability** | 61 files (487 tests passed) | 61 files (487 tests passed) | **61 files (487 tests passed, 100%)** |

---

## 5. Development & Verification Guide

### 5.1 Verification Commands (Docker Environment)

```bash
# 1. Run production build and verify chunk sizes
COMPOSE_PROJECT_NAME=coneshare docker-compose exec frontend npm run build

# 2. Inspect generated assets and distribution
ls -lh frontend/dist/assets/

# 3. Execute frontend test suite
COMPOSE_PROJECT_NAME=coneshare docker-compose exec frontend npm run test:whitelist
```

### 5.2 Browser Network Inspection
1. Open Chrome DevTools (`F12`), navigate to **Network**, and enable **Disable cache**.
2. Filter by **JS** and load a public dataroom URL (`/view/:slug`).
3. Verify that `index-*.js` and `vendor-react-*.js` are loaded.
4. Filter/search for `recharts` or `Admin`: verify that **zero** requests are dispatched.
