/**
 * Diagnoses HTTPS reachability to the npm registry (same family of requests `npm install` uses).
 * Usage: node scripts/check-npm-registry.mjs
 * Or:    npm_config_registry=https://registry.npmmirror.com node scripts/check-npm-registry.mjs
 */

const registry = (process.env.npm_config_registry || 'https://registry.npmjs.org').replace(/\/$/, '');
const url = `${registry}/@eslint%2fjs`;

console.log(`Testing GET ${url}\n`);

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  clearTimeout(timeout);

  console.log(`HTTP ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const body = await res.text();
    console.error('\nUnexpected response body (first 500 chars):');
    console.error(body.slice(0, 500));
    process.exit(1);
  }

  console.log('\nRegistry is reachable. If `npm install` still fails, try:');
  console.log('  npm cache clean --force');
  console.log('  Delete node_modules and package-lock.json, then npm install');
  console.log('  Or use Node 22 LTS if you suspect Node 24 + npm 11 compatibility issues.');
} catch (e) {
  const msg = e.cause?.message || e.cause?.code || e.message;
  console.error('\nFetch failed:', msg);
  console.error('\nThis usually means TLS/proxy/firewall/DNS is blocking npm registry access.');
  console.error('Try:');
  console.error('  - Browser opens https://registry.npmjs.org');
  console.error('  - npm config get proxy / https-proxy (unset if wrong)');
  console.error('  - Corporate SSL inspection: trust root cert or use registry mirror you can access');
  console.error('  - China network: npm config set registry https://registry.npmmirror.com');
  process.exit(1);
}
