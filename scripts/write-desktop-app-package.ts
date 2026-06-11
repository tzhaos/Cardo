import fs from 'node:fs';

const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
  description: string;
  name: string;
  version: string;
};

const productName = process.env.KHAOSBOX_DESKTOP_PRODUCT_NAME || 'KhaosBox';

fs.writeFileSync(
  'artifacts/desktop/package.json',
  `${JSON.stringify(
    {
      name: rootPackage.name,
      productName,
      description: rootPackage.description,
      version: rootPackage.version,
      main: 'main/main.js',
      type: 'module',
    },
    null,
    2,
  )}\n`,
);
