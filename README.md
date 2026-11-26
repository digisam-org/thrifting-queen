# Thrifting Queen 👑

An offline-capable Scotland map app for Angi — showing her cartoonised avatar on the map along with nearby **cafes, bookshops, charity shops, and antique shops** across Scotland.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture plan and roadmap.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Populate the Full Scotland Database (OpenStreetMap)

The repo ships with a starter seed of 36 Scottish spots so you can run the app immediately. To pull all ~5,000–10,000 cafes, bookshops, charity shops, and antique shops across Scotland from OpenStreetMap (zero extra Python dependencies):

```bash
npm run data:fetch
```

Or include general second-hand shops under Charity Shops as well:

```bash
python3 scripts/fetch_scotland_places.py --include-second-hand
```

## Personalising the Gift

- **Cartoon Avatar:** Replace `public/icons/angi-avatar.svg` with your custom cartoon artwork (SVG or PNG).
- **Custom Pins & Notes:** Add your own favourite spots or secret notes in `public/data/personal-picks.json`. Refreshing the OSM dataset never overwrites this file.

## Deploying Free on GitHub Pages (iPhone PWA)

1. Push this repo to GitHub (`main` branch).
2. In your GitHub repo go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` will build and deploy to `https://digisam-org.github.io/thrifting-queen/`.
4. On her iPhone, open the link in **Safari**, tap **Share → Add to Home Screen**, and allow location access.

## Future Android App (Capacitor)

When ready to build a standalone offline `.apk` for Android:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/geolocation
npx cap init "Thrifting Queen" com.thriftingqueen.app --web-dir dist
npm run build:capacitor
npx cap add android
npx cap sync android
```
