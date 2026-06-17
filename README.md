# oqracam — Oqra official website

Static marketing + legal site for **Oqra**, the hybrid film camera for iPhone
(internal codename: FilmBo). No build step — plain HTML / CSS / vanilla JS.
Design mirrors the app's chrome: pure-black canvas, SF-Pro-Light type, the
visible-spectrum gradient as the only colour, hard edges (no rounded corners).

## Structure

Single page — everything lives in `index.html` with in-page anchor nav
(`#features`, `#compare`, `#support`, `#decode`, `#privacy`).

```
index.html      ← the whole site: hero · features · before/after · CTA ·
                  support (FAQ) · decode tool · privacy policy · footer
styles.css      ← design tokens (mirror the app) + all styles
compare.js      ← before/after reveal slider + scene/film pickers
share.js        ← client-side preset-code decoder → downloads a .fbp
404.html        ← branded not-found page
manifest.json · robots.txt · sitemap.xml

assets/img/             ← logo (oqra-mark / apple-touch / icon-1024) + samples/
assets/img/samples/     ← 25 web-ready 1024² JPEGs (5 scenes × OG + 4 looks)
assets/SamplePhotos/    ← SOURCE photos (DNG + exported HEIC). NOT published
                          (see .assetsignore); regenerate samples/ from here.

.well-known/apple-app-site-association  ← AASA: lets oqra.app/p/<code> open the app
_headers        ← AASA content-type, asset caching, security headers
_redirects      ← /p/<code> → / (share.js decodes the payload in-page)
.assetsignore   ← keeps .git, source photos, etc. out of the deploy
```

Preview locally with any static server (absolute `/asset` paths need a web root):
`python3 -m http.server 8011` → http://localhost:8011/.

## Updating the sample photos

The before/after widget reads `assets/img/samples/<scene>_<og|amethyst|crystal|onyx|verdigris>.jpg`.
To refresh: drop the source DNG/HEIC into `assets/SamplePhotos/`, then re-export
square 1024² JPEGs into `assets/img/samples/` (centre-crop, quality ~70).

## Deploying — `oqra.app` on a header-capable host

The app's QR codec hardcodes `https://oqra.app/p/<code>` (`PresetQRCodec.urlPrefix`),
and the AASA file must be served with `Content-Type: application/json` — which
plain GitHub Pages can't do. Host on **Cloudflare** (current), Netlify, or Vercel;
`_headers` and `_redirects` are picked up automatically.

Verify after deploy:
- `curl -I https://oqra.app/.well-known/apple-app-site-association` → `content-type: application/json`
- `https://oqra.app/p/<code>` returns 200 and the decoder shows the recipe
- the `.fbp` download works (if the CSP blocks the blob download, add `blob:` to
  `default-src` in `_headers`)

## Remaining work

- [ ] Real hero shot (`assets/img/hero.jpg`) — currently a placeholder block.
- [ ] App Store link (CTAs read "On the App Store · soon" until then; TestFlight is live).
- [ ] **Deeplink iOS side** (FilmBo repo): Associated Domains capability on App ID
  `com.kuangming.FilmBo-iOS` (Team `R47YR9KUY4`), `applinks:oqra.app` in the
  entitlements, and a `.onContinueUserActivity` handler that decodes via
  `PresetQRCodec.decode(scanned:)`. Until then, the web `#decode` tool is the
  fallback (download the `.fbp`, import in-app). Universal links require a
  real-device test.
