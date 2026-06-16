# oqracam — Oqra official website

Static marketing + legal site for **Oqra**, the film camera for iPhone
(codename: FilmBo). No build step — plain HTML/CSS.

> **Name note:** the original README here was a privacy policy that called the
> app "LumBo Cam". The public name is **Oqra**; that text now lives in
> [`privacy.html`](privacy.html) with the name corrected. If "LumBo Cam" is
> actually the canonical store name, search-and-replace `Oqra` across the site.

## Pages

```
index.html     ← landing: hero, features, screenshots, download CTA
privacy.html   ← privacy policy (App Store requires a public URL)
support.html   ← support + FAQ (App Store requires a support URL)
styles.css     ← design tokens (mirror the app chrome) + all page styles
assets/img/    ← hero shot, screenshots, App Store badge, og image

.well-known/apple-app-site-association  ← AASA: lets oqra.app/p/<code> open the app
shared.html    ← friendly fallback when the app isn't installed (served for /p/<code>)
_headers       ← forces application/json on the AASA file (Cloudflare/Netlify)
_redirects     ← rewrites /p/<code> → shared.html (target is outside /p/ to avoid a loop)
.assetsignore  ← keeps .git / .wrangler / etc. from being published
```

Open any `.html` file in a browser to preview. Search for `TODO:` to find every
placeholder that needs your input (App Store link, domain, screenshots, device
requirements, footer entity).

## Before publishing — checklist

- [ ] Confirm the public app name (Oqra vs. LumBo Cam) across all pages.
- [ ] Replace the App Store `href="#"` links in `index.html` with the real URL.
- [ ] Drop real screenshots into `assets/img/` (`hero.jpg`, `shot-1..3.jpg`).
- [ ] Add the official Apple "Download on the App Store" badge SVG.
- [ ] Set `og:url` / `og:image` in `index.html` once the domain + share image exist.
- [ ] Confirm supported-device / iOS line in `support.html`.

## Deploying — must be at `oqra.app` on a header-capable host

The app's QR codec hardcodes `https://oqra.app/p/<code>` (`PresetQRCodec.urlPrefix`),
so the deeplink domain is **`oqra.app`**, and the AASA file must be served there
with `Content-Type: application/json`. **Plain GitHub Pages can't set that header**,
so host on **Cloudflare Pages** (recommended), Netlify, or Vercel.

Cloudflare Pages (recommended):
1. Cloudflare dashboard → Workers & Pages → create a Pages project → connect this
   GitHub repo → build command: none, output dir: `/` (root).
2. Add custom domain `oqra.app`. Point the AWS/Route 53 domain's DNS at the
   Pages project (Cloudflare will give you the records; or move the zone to
   Cloudflare). The `_headers` and `_redirects` files are picked up automatically.
3. Verify: `curl -I https://oqra.app/.well-known/apple-app-site-association`
   must return `content-type: application/json`. Apple's CDN copy:
   `https://app-site-association.cdn-apple.com/a/v1/oqra.app`.

(Netlify/Vercel also read `_headers`/`_redirects`; on Vercel use `vercel.json`
headers instead.)

## Deeplink (universal links) — remaining work

Website side is done (this repo). Still required:

- **Apple Developer portal:** enable the *Associated Domains* capability on App ID
  `com.kuangming.FilmBo-iOS` (Team `R47YR9KUY4`).
- **iOS app** (FilmBo repo): add `applinks:oqra.app` to `FilmBo-iOS.entitlements`;
  add a `.onContinueUserActivity(NSUserActivityTypeBrowsingWeb)` handler that
  decodes via `PresetQRCodec.decode(scanned:)` and imports the recipe (needs a new
  `AppState` import-from-`FilmRecipe` method — only a file-URL importer exists today).
- **Test on a real device** (universal links don't work in the Simulator); first
  install must come from a profile carrying the entitlement.
