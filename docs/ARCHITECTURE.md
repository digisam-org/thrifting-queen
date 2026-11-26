# Thrifting Queen — Architecture & Implementation Plan

A personal, offline-capable map app built for Angi to discover **cafes, bookshops, charity shops, and antique shops** across Scotland — with a cartoonised avatar showing her live location.

---

## 1. Guiding Architectural Principles

1. **Zero Backend / Zero Hosting Cost:** All place data, user state (favourites, visited spots, notes), and search run 100% locally on the device. Static assets are served free via GitHub Pages and cached on-device by a Service Worker.
2. **iPhone PWA First, Android APK Ready:** Built with React + TypeScript + Vite + MapLibre GL JS. Platform boundaries (GPS location, local storage, external map links) live behind clean service interfaces in `src/services/` so wrapping into a standalone Android `.apk` via **Capacitor** later requires zero UI rewrite.
3. **Resilient Data Pipeline:** OpenStreetMap (OSM) data is fetched via a reproducible script into `public/data/scotland-places.json`. Personal picks / gift touches live in a separate `public/data/personal-picks.json` overlay so refreshing OSM data never overwrites custom entries.
4. **iOS Ergonomics:** Full-bleed viewport (`viewport-fit=cover`), safe-area insets for Dynamic Island / Home Indicator, touch-friendly floating controls, and smooth WebGL vector map clustering.

---

## 2. Tech Stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| **UI Framework** | React 19 + TypeScript + Vite | Fast builds, tiny bundle, ideal for both PWA & Capacitor |
| **Map Engine** | MapLibre GL JS | WebGL 60fps retina maps, GPU clustering for 8,000+ POIs, free OpenFreeMap vector tiles, future offline PMTiles support |
| **PWA / Offline** | `vite-plugin-pwa` (Workbox) | Auto-generates manifest + Service Worker; precaches app shell + Scotland dataset |
| **Data Source** | OpenStreetMap (Overpass API / Geofabrik Scotland extract) | Best free UK coverage for `shop=charity`, `shop=antiques`, `shop=books`, `amenity=cafe` |
| **Local State** | `localStorage` (swappable to IndexedDB/Capacitor Preferences) | Saves visited places, favourites, and personal notes locally |
| **Deployment** | GitHub Pages + GitHub Actions | Free HTTPS static hosting required for iOS Safari PWA install & GPS |
| **Future Android** | Capacitor (`@capacitor/android`, `@capacitor/geolocation`) | Packages the exact `dist/` bundle into a permanent offline `.apk` |

---

## 3. Repository Structure

```text
thrifting-queen/
├── .github/workflows/
│   └── deploy.yml                  # Auto-build & deploy PWA to GitHub Pages
├── docs/
│   └── ARCHITECTURE.md             # This architecture & roadmap doc
├── public/
│   ├── data/
│   │   ├── scotland-places.json    # Bundled Scotland POIs (seed now, full OSM via script)
│   │   └── personal-picks.json     # Custom hand-picked places & notes overlay
│   └── icons/
│       ├── angi-avatar.svg         # Cartoon avatar placeholder (swap with custom art)
│       ├── icon-192.svg            # PWA icon
│       └── icon-512.svg            # PWA icon
├── scripts/
│   └── fetch_scotland_places.py    # Zero-dependency Python pipeline to build full Scotland DB
├── src/
│   ├── components/
│   │   ├── AvatarMarker.tsx        # Cartoonised user marker on the map
│   │   ├── CategoryFilterBar.tsx   # Floating category pills + search input
│   │   ├── MapControls.tsx         # Locate Me, Nearby List, Demo Location controls
│   │   ├── MapView.tsx             # MapLibre GL JS canvas, GeoJSON clustering & layers
│   │   ├── NearbyDrawer.tsx        # Distance-sorted nearby places sheet
│   │   └── PlaceDetailSheet.tsx    # Bottom sheet with hours, directions, visited/favourite/notes
│   ├── data/
│   │   └── categories.ts           # Category metadata (colors, labels, icons)
│   ├── hooks/
│   │   ├── useGeolocation.ts       # Reactive GPS tracking with graceful fallback
│   │   ├── usePlaces.ts            # Loads & merges Scotland DB + personal picks
│   │   └── useUserPlaces.ts        # Reactive favourites, visited flags & notes
│   ├── services/
│   │   ├── location.ts             # Platform GPS abstraction (Web Geolocation -> Capacitor later)
│   │   ├── placesRepository.ts     # Local fetch, merge, search & spatial distance helpers
│   │   └── userStore.ts            # Local persistence for visited/favourites/notes
│   ├── styles/
│   │   └── global.css              # Warm Scottish thrifting palette & iOS safe-area styles
│   ├── types/
│   │   └── place.ts                # Core TypeScript domain models
│   ├── App.tsx                     # Root composition
│   └── main.tsx                    # App entry + PWA Service Worker registration
├── index.html                      # iOS PWA meta tags & viewport configuration
├── package.json
├── tsconfig.json
└── vite.config.ts                  # Vite + PWA manifest + Workbox caching rules
```

---

## 4. Phased Build Roadmap

- **Phase 1 — Foundation & Scaffold (Done):** Complete PWA architecture, MapLibre map with clustering, cartoon avatar marker, category filters, search, nearby drawer, place detail bottom sheet, local visited/favourite/notes storage, GitHub Pages CI/CD, and Scotland OSM fetch script.
- **Phase 2 — Full Scotland Database:** Run `python3 scripts/fetch_scotland_places.py` to populate `public/data/scotland-places.json` with all ~5,000–10,000 Scotland cafes, bookshops, charity shops, and antique shops, and verify bundle size & filtering performance.
- **Phase 3 — Cartoon Avatar & Personal Touches:** Replace `public/icons/angi-avatar.svg` with custom cartoon artwork of Angi, generate crisp PNG Apple Touch Icons (`180x180`, `192x192`, `512x512`), add custom pins/messages in `public/data/personal-picks.json`, and customize welcome greeting / splash theme.
- **Phase 4 — iPhone Install & Polish:** Enable GitHub Pages in repo Settings, open on iPhone Safari, tap **Share -> Add to Home Screen**, test GPS & offline behaviour in airplane mode.
- **Phase 5 — Android APK (Capacitor):** Add `@capacitor/core`, `@capacitor/android`, and `@capacitor/geolocation`, build with `VITE_BASE_PATH=./`, and generate a signed standalone `.apk` for Android.
