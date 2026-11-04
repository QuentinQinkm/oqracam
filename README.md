# oqracam — Oqra official website

Static marketing + legal site for **Oqra**, the hybrid film camera for iPhone
(internal codename: FilmBo). No build step — plain HTML / CSS / vanilla JS.
Design mirrors the app's chrome: pure-black canvas, SF-Pro-Light type, the
visible-spectrum gradient as the only colour, hard edges (no rounded corners).

## Structure

Single page — everything lives in `index.html` with in-page anchor nav
(`#features`, `#compare`, `#support`, `#build`, `#privacy`).

```
index.html      ← the whole site: hero · features · before/after · CTA ·
                  support (FAQ) · build & share · privacy policy · footer
styles.css      ← design tokens (mirror the app) + all styles
compare.js      ← before/after reveal slider + scene/preset pickers
sideways.js     ← pinned sections where scrolling down moves a row left
404.html        ← branded not-found page
manifest.json · robots.txt · sitemap.xml

assets/img/             ← logo (oqra-mark / apple-touch / icon-1024) + samples/
assets/img/samples/     ← 25 web-ready 1024² WebPs (5 scenes × OG + 4 looks)
assets/SamplePhotos/    ← SOURCE photos (DNG + exported HEIC). NOT published
                          (see .assetsignore); regenerate samples/ from here.

.well-known/apple-app-site-association  ← AASA: lets oqra.app/p/<code> open the app
_headers        ← AASA content-type, asset caching, security headers
_redirects      ← /p/<code> → / (the home page, when the app is not installed)
.assetsignore   ← keeps .git, source photos, etc. out of the deploy
```

Preview locally with any static server (absolute `/asset` paths need a web root):
`python3 -m http.server 8011` → http://localhost:8011/.

## Updating the sample photos

The before/after widget reads `assets/img/samples/<scene>_<og|golden|sunburn|window|monor>.webp`.
To refresh: develop each RAW with the app's harness (`filmbo-calibrate <Preset>.fbp
--dng <file> --develop out.png`, `FILMBO_DEVELOP_LONGEDGE=1366`), decode the original
with `CIRAWFilter`, then centre-crop to 1024² and encode with `cwebp -q 80`.

## Deploying — `oqra.app` on a header-capable host

The app's QR codec hardcodes `https://oqra.app/p/<code>` (`PresetQRCodec.urlPrefix`),
and the AASA file must be served with `Content-Type: application/json` — which
plain GitHub Pages can't do. Host on **Cloudflare** (current), Netlify, or Vercel;
`_headers` and `_redirects` are picked up automatically.

Verify after deploy:
- `curl -I https://oqra.app/.well-known/apple-app-site-association` → `content-type: application/json`
- `https://oqra.app/p/<code>` returns 200 and shows the home page

## Remaining work

- [ ] Real hero shot (`assets/img/hero.jpg`) — currently a placeholder block.
- [ ] **Deeplink iOS side** (FilmBo repo): Associated Domains capability on App ID
  `com.kuangming.FilmBo-iOS` (Team `R47YR9KUY4`), `applinks:oqra.app` in the
  entitlements, and a `.onContinueUserActivity` handler that decodes via
  `PresetQRCodec.decode(scanned:)`. Universal links require a real-device test.
