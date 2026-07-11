import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'assets/brand/cardo-mark.svg');
const svg = fs.readFileSync(svgPath);

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

const extensionDir = path.join(root, 'assets/extension-shell/icons');
const brandDir = path.join(root, 'assets/brand');
fs.mkdirSync(extensionDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const out = path.join(extensionDir, `icon-${size}.png`);
  fs.writeFileSync(out, renderPng(size));
  console.log('wrote', path.relative(root, out), fs.statSync(out).size);
}

for (const size of [256, 512]) {
  const out = path.join(brandDir, `cardo-icon-${size}.png`);
  fs.writeFileSync(out, renderPng(size));
  console.log('wrote', path.relative(root, out), fs.statSync(out).size);
}

const icoBuffers = [16, 32, 48, 64, 128, 256].map((size) => renderPng(size));
const icoPath = path.join(brandDir, 'cardo-icon.ico');
fs.writeFileSync(icoPath, await pngToIco(icoBuffers));
console.log('wrote', path.relative(root, icoPath), fs.statSync(icoPath).size);
