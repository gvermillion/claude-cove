# 📚 Book Library Scanner

A mobile-first Progressive Web App (PWA) for cataloguing your personal book library by
scanning barcodes. Point your phone's camera at any book's ISBN barcode — the app fetches
full metadata and adds it to your local library instantly.

**Works offline. Installable on iOS, Android, and desktop. No account required.**

---

## Features

- **Barcode scanning** — Aims the rear camera at EAN-13/UPC book barcodes
- **Rich metadata** — Title, authors, cover image, publisher, page count, genres, synopsis
- **Dual data sources** — Open Library (primary, free) with Google Books fallback
- **Reading status** — Track Unread / Reading / Read / Did Not Finish per book
- **Star ratings** — Rate books 1–5 stars
- **Personal notes** — Free-form notes per book
- **Search & filter** — Full-text search + filter by read status
- **Export / Import** — Backup your library as JSON
- **Native dark/light mode** — Respects your OS setting automatically
- **Offline-capable** — Works without internet after first load

---

## Quick Start

### Prerequisites

- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Node.js 20+

### Install & Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser. For camera access on desktop, use Chrome
or Firefox (Safari requires HTTPS for camera APIs).

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

All variables are optional — the app works without any API keys using Open Library.

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_BOOKS_API_KEY` | Google Books API key (higher quota, richer covers) |

### Build for Production

```bash
pnpm build        # outputs to dist/
pnpm preview      # preview the production build locally
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

---

## Installing on iOS

1. Open the deployed URL in **Safari** on your iPhone or iPad
2. Tap the **Share** button (the box with an arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** — the app icon will appear on your home screen
5. Launch it from the home screen for a full-screen, app-like experience

> **Note:** Camera access requires iOS 14.3+ and Safari. Chrome/Firefox on iOS cannot
> install PWAs due to Apple's WebKit restriction.

## Installing on Android

1. Open the app in **Chrome**
2. Chrome will show an "Add to Home Screen" banner automatically
3. Or tap the menu (⋮) → **Add to Home Screen**

---

## Architecture

```
src/
├── domain/           # Core types: Book, LibraryEntry, ReadStatus
├── application/      # Use cases: lookupBookByIsbn, scanAndAddBook, libraryService
├── infrastructure/   # Adapters: Dexie/IndexedDB, Open Library API, Google Books API
└── entrypoints/      # React components, hooks, router, global CSS
```

- **Storage**: IndexedDB via [Dexie.js](https://dexie.org) — all data stays on your device
- **Barcode scanning**: [@zxing/browser](https://github.com/zxing-js/browser) via WebRTC camera
- **Offline**: Workbox service worker caches the app shell and book cover images
- **Theme**: CSS custom properties bound to `prefers-color-scheme` — automatic dark/light

---

## Development

```bash
pnpm dev          # Start dev server with HMR
pnpm typecheck    # TypeScript type check (strict)
pnpm lint         # ESLint
pnpm test         # Run unit tests (Vitest)
pnpm test:coverage # Coverage report
pnpm build        # Production build
```

---

## Data & Privacy

All your library data is stored locally in your browser's IndexedDB. Nothing is sent to
any server. The app only makes outbound requests to Open Library and Google Books APIs
to fetch book metadata when you scan a new book.

Export your library at any time: **Library → ⋮ → Export JSON**.
