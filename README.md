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

## Aliyun mirror — `oqracam.com`

The selected deployment target is the existing Aliyun Ubuntu/Nginx server.
The GitHub Actions workflow `.github/workflows/deploy-aliyun.yml` publishes
`main`, using `node scripts/build-site.mjs --target=nginx` to package only public
files. Existing Nginx configuration supplies HTTPS, route handling, security
headers, and asset caching; no additional ESA hosting plan is required.

The builder adds each stylesheet and script's SHA-256 content version to its URL
in generated HTML, including the optional ESA route fallback. A changed file gets
a fresh browser cache entry, preventing old CSS or JavaScript from being paired
with a new page. Source HTML stays unchanged for Cloudflare and local previews.

The workflow uses the `ALIYUN_DEPLOY_KEY` and `ALIYUN_KNOWN_HOSTS` repository
secrets and the `ALIYUN_HOST` variable. Its dedicated SSH key can only invoke
the root-owned receiver at `/usr/local/libexec/oqracam-deploy.py`; it has no
interactive shell or sudo access. Releases live in `/srv/oqracam/deploy/releases`.
The receiver switches `/srv/oqracam/deploy/current` atomically and restores the
previous release if its HTTPS check fails. `deploy-revision.txt` identifies the
deployed commit. The original `/srv/oqracam/site` is retained for recovery.

An ESA Pages test project was also verified, but no ESA site plan was purchased
and the domain was not moved. Its optional `esa.jsonc` configuration uses the
same builder without `--target=nginx`. [Aliyun's native GitHub guide](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/connect-pages-to-github)
documents that alternative.

## Remaining work

- [ ] Real hero shot (`assets/img/hero.jpg`) — currently a placeholder block.
- [ ] **Deeplink iOS side** (FilmBo repo): Associated Domains capability on App ID
  `com.kuangming.FilmBo-iOS` (Team `R47YR9KUY4`), `applinks:oqra.app` in the
  entitlements, and a `.onContinueUserActivity` handler that decodes via
  `PresetQRCodec.decode(scanned:)`. Universal links require a real-device test.
