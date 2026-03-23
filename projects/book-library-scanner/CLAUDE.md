# Book Library Scanner

A Progressive Web App (PWA) for cataloguing a personal book library by scanning barcodes.
Point the camera at any book's ISBN barcode — the app fetches metadata from Open Library
and Google Books, then stores the book in a local IndexedDB database. Works offline.
Installable on iOS, Android, and desktop directly from the browser.

## Architecture

**Layer structure** follows the standard workspace layout:

```
src/
├── domain/          # Pure types: Book, LibraryEntry, ScanResult, ReadStatus
├── application/     # Use cases: lookupBookByIsbn, scanAndAddBook, libraryService
├── infrastructure/  # Adapters: Dexie (IndexedDB), Open Library client, Google Books client
└── entrypoints/     # React app: components, hooks, router, CSS
```

**Key patterns:**
- **Adapter** — `openLibraryClient` and `googleBooksClient` normalize raw API responses
  into the canonical `Book` type. UI never sees raw API shapes.
- **Repository** — `libraryRepository` (in `infrastructure/db.ts`) encapsulates all
  IndexedDB/Dexie interactions. Application use cases depend on this abstraction.
- **Fallback chain** — `lookupBookByIsbn` tries Open Library first, falls back to
  Google Books. Both clients implement the same interface contract.
- **Result type** — `neverthrow` `Result<T, E>` used for all fallible operations.
  No thrown exceptions in application/infrastructure layers.

**Data flow:**

```
Camera → @zxing/browser → ISBN string
  → lookupBookByIsbn (Open Library → Google Books)
  → Book (normalized metadata)
  → createLibraryEntry (adds user fields)
  → libraryRepository.add() (IndexedDB)
  → UI re-renders via useLiveQuery (Dexie reactive hook)
```

**Dark/Light mode:**
Implemented via CSS custom properties (`--color-bg`, `--color-text-primary`, etc.)
bound to `prefers-color-scheme`. Tailwind's `darkMode: 'media'` is configured.
No JS toggle — it's native and automatic.

## How to Run

```bash
# Install dependencies
pnpm install

# Development server (with hot reload)
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

## Environment Variables

```
VITE_GOOGLE_BOOKS_API_KEY   # Optional. Increases Google Books quota. Without this,
                             # only Open Library is queried (still excellent coverage).
VITE_LANGFUSE_PUBLIC_KEY    # Optional. LLM observability — not yet wired in v0.1.
VITE_LANGFUSE_HOST          # Optional. Defaults to https://cloud.langfuse.com.
```

Copy `.env.example` to `.env` and fill in any keys you have.

## Key Decisions & Constraints

- **Local-only storage** — All data lives in IndexedDB (Dexie). No backend, no accounts,
  no sync. The user owns their data. Export/import as JSON for backups.
- **No server required** — The app is a static bundle. Deploy to any static host
  (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
- **Open Library first** — Free, no key, large catalog. Google Books is the fallback
  for books OL doesn't have. An optional `VITE_GOOGLE_BOOKS_API_KEY` raises quota.
- **@zxing/browser for scanning** — Pure web standard (WebRTC + getUserMedia). Works
  in Safari on iOS 14.3+. No native bridge, no Capacitor, no Cordova.
- **Cover images cached via Workbox** — Cover images from Open Library are cached
  `CacheFirst` for 30 days so the library works offline after first load.
- **ISBN-only scanning** — EAN-13, EAN-8, UPC-A formats targeted. Cover photo scanning
  (title/author OCR) is out of scope for v0.1.

## iOS Installation

1. Open the app in **Safari** on iOS (Chrome/Firefox on iOS cannot install PWAs).
2. Tap the **Share** button (box with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** — the app icon appears on your home screen.
5. Open it from the home screen for the full standalone experience (no browser chrome).

## CI / CD

No CI pipeline configured yet. Target pipeline (to add):
- `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`
- Deploy to Cloudflare Pages or Netlify on push to `develop`.

## Observability

No observability wired in v0.1 (single-user local app with no server).
Future: Langfuse for prompt tracing if AI-assisted metadata enrichment is added.

## Standards Overrides

- **No backend / no Docker** — This project is a static PWA with no server-side
  infrastructure. The workspace standard requiring Docker for infrastructure
  dependencies does not apply.
- **No pre-commit hooks configured yet** — To add in a follow-up PR before merging
  to `develop`.
