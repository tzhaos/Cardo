# Cardo brand assets

Selected identity: symmetrical split-C mark (upper charcoal / lower mid-gray).

| File | Use |
| --- | --- |
| `cardo-mark.svg` | App / extension icon base (light tile) |
| `cardo-mark-on-white.svg` | Pure mark, transparent canvas |
| `cardo-mark-monochrome.svg` | Dark-tile mark for chrome / tray |
| `cardo-wordmark.svg` | Type only |
| `cardo-lockup.svg` | Logo + wordmark (dark) |
| `cardo-lockup-light.svg` | Logo + wordmark (light) |
| `cardo-icon-256.png` | Desktop window / taskbar (dev) |
| `cardo-icon-512.png` | electron-builder mac/linux icon source |
| `cardo-icon.ico` | electron-builder Windows multi-size icon |

Extension / tray PNGs: `assets/extension-shell/icons/icon-{16,32,48,128}.png`

Regenerate vector mark + rasters:

```bash
python scripts/build-cardo-mark-svg.py
npm install --no-save @resvg/resvg-js png-to-ico
node scripts/generate-brand-icons.mjs
```

Palette: upper `#1C1C1E`, lower `#6E6E73`, tile `#F3F4F6` / mono tile `#111827`.
