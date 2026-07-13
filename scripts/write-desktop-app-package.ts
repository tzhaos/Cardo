import fs from 'node:fs';
import path from 'node:path';

const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
  description: string;
  name: string;
  version: string;
};

const productName = process.env.CARDO_DESKTOP_PRODUCT_NAME || 'Cardo';
const desktopRoot = path.resolve('artifacts/desktop');
const webRuntimeSrc = path.resolve('artifacts/web-runtime');
const webRuntimeDest = path.join(desktopRoot, 'web-runtime');
const nativeHostSrcExe = path.resolve('artifacts/native-host/cardo-native-host.exe');
const nativeHostDestDir = path.join(desktopRoot, 'native-host');
const extensionShellManifest = path.resolve('assets/extension-shell/manifest.json');

if (!fs.existsSync(path.join(webRuntimeSrc, 'index.html'))) {
  throw new Error(
    'Missing artifacts/web-runtime/index.html. Run `npm run desktop:build` (or web-runtime:build) first.',
  );
}

if (!fs.existsSync(nativeHostSrcExe)) {
  throw new Error(
    'Missing artifacts/native-host/cardo-native-host.exe. Run `npm run native-host:build` first.',
  );
}

fs.mkdirSync(desktopRoot, { recursive: true });

fs.writeFileSync(
  path.join(desktopRoot, 'package.json'),
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

// Packaged Desktop embeds Runtime + hosts UI from /app/. Static files must ship with the app
// (not only present in the monorepo artifacts/ tree during local dev).
fs.rmSync(webRuntimeDest, { recursive: true, force: true });
fs.cpSync(webRuntimeSrc, webRuntimeDest, { recursive: true });
console.log(`Wrote ${path.join(desktopRoot, 'package.json')}`);
console.log(`Copied web-runtime → ${webRuntimeDest}`);

// Native Messaging host for Extension discover (extraResources → resources/native-host).
fs.rmSync(nativeHostDestDir, { recursive: true, force: true });
fs.mkdirSync(nativeHostDestDir, { recursive: true });
fs.copyFileSync(nativeHostSrcExe, path.join(nativeHostDestDir, 'cardo-native-host.exe'));
if (fs.existsSync(extensionShellManifest)) {
  fs.copyFileSync(extensionShellManifest, path.join(nativeHostDestDir, 'extension-manifest.json'));
}
console.log(`Copied native-host → ${nativeHostDestDir}`);
