import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = path.join(root, 'assets/brand');
const pure = fs.readFileSync(path.join(brand, 'cardo-mark-on-white.svg'), 'utf8');
const withBg = pure.replace(
  'aria-label="Cardo mark">',
  'aria-label="Cardo mark"><rect width="128" height="128" fill="#ffffff"/>',
);
const png = new Resvg(withBg, { fitTo: { mode: 'width', value: 512 } }).render().asPng();
fs.writeFileSync(path.join(brand, '_preview-mark-pure.png'), png);
const tile = fs.readFileSync(path.join(brand, 'cardo-mark.svg'));
fs.writeFileSync(
  path.join(brand, '_preview-mark.png'),
  new Resvg(tile, { fitTo: { mode: 'width', value: 512 } }).render().asPng(),
);
console.log('previews written');
