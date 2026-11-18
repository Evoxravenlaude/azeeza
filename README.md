# Azeeza Omipidan, portfolio

A static site: plain HTML, CSS and JavaScript. No build step and no framework.

## Deploy to Vercel

**From GitHub (recommended)**

1. Put this folder in a new GitHub repository, with `index.html` at the root.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Other**. Leave the build command and output directory empty.
4. Click **Deploy**.

**From your computer**

```bash
npm i -g vercel
cd azeeza-portfolio
vercel          # first run links the project and makes a preview
vercel --prod   # publishes to production
```

## After the first deploy

1. **Domain:** add it under Project → Settings → Domains.
2. **Share image:** in `index.html`, change the two `/og.jpg` values (`og:image` and `twitter:image`) to the full address, e.g. `https://your-domain.com/og.jpg`. LinkedIn, WhatsApp and X need the full address to show the preview.
3. Optional: turn on **Web Analytics** in the Vercel dashboard (Analytics tab) to see visits.

## What is where

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `css/site.css` | All styles |
| `js/app.js` | Scroll scenes, cursor, cards, dial, menu, sound |
| `js/gl.js` | WebGL: halftone hero and curved gallery |
| `vendor/` | GSAP, ScrollTrigger, Lenis and three.js, bundled locally |
| `fonts/` | Archivo, Instrument Serif and Geist Mono, self-hosted (no Google Fonts requests) |
| `img/` | Photos (`img/s/` holds small versions for thumbnails) |
| `og.jpg` | 1200 × 630 share image |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | Icons |
| `404.html` | Page shown for unknown addresses |
| `vercel.json` | Clean URLs, caching and security headers |

## Editing

- **Text** lives in `index.html`. Work cards are the `<article class="moment">` blocks. The back of each card is the `.face--back` part.
- **Colours and fonts** are the variables at the top of `css/site.css`.
- **Replacing a photo:** give the new photo a new file name and update every place the old name appears in `index.html` and `js/app.js`. Images are cached for a year, so a new photo saved under an old name would not reach returning visitors.
- **Hero photos** are listed in `HERO_SRC` in `js/app.js`.

## Notes

- Visitors with reduced motion switched on get a static version.
- If WebGL is unavailable, the hero and gallery fall back to normal images.
- `css/` and `js/` are cached for one hour, so edits appear within an hour of a redeploy, or straight away in a private window.
