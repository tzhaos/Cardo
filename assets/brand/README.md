# Cardo brand assets

Selected identity: orbit mark + inverted-bar wordmark.

| File | Use |
| --- | --- |
| `cardo-mark.svg` | App / extension icon base |
| `cardo-mark-monochrome.svg` | Single-color mark |
| `cardo-wordmark.svg` | Type only |
| `cardo-lockup.svg` | Logo + wordmark (dark) |
| `cardo-lockup-light.svg` | Logo + wordmark (light) |
| `cardo-icon-256.png` | Desktop window / taskbar (dev) |
| `cardo-icon-512.png` | electron-builder mac/linux icon source |
| `cardo-icon.ico` | electron-builder Windows multi-size icon |

Extension / tray PNGs: `assets/extension-shell/icons/icon-{16,32,48,128}.png`

Regenerate raster icons from the mark (requires temp deps):

```bash
npm install --no-save @resvg/resvg-js png-to-ico
node scripts/generate-brand-icons.mjs
```

Palette: tile `#171C24` / bar `#111827`, accent `#38BDF8`, light `#F8FBFF`.
