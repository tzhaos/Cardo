/**
 * Architecture guard for the multi-host layout.
 *
 * Rules checked:
 * - core/ is runtime agnostic: no React, Zustand, DOM types/globals, browser globals, or host imports.
 * - web/ owns React UI and may import core, but must not import extension, desktop, or cli.
 * - extension/ adapters may import core; only extension/bootstrap may import web.
 * - desktop/renderer may host web; other desktop modules must not import web, extension, or cli.
 * - cli/ is a Node adapter over core and must not import web, extension, or desktop.
 * - web/widgets/ must stay presentational and must not import stores, toast libraries, or host adapters.
 * - web features must not import app ports directly; feature UI must not import app stores, app use-cases, or sonner directly.
 * - settings shell must stay a thin tab host; data/theme/about/general panels own their local UI.
 * - web/app and web/features must import feature public APIs through index.ts barrels.
 * - legacy top-level src/app, src/domains, src/features, src/widgets, src/lib, and src/integrations must not exist.
 * - legacy companion/windows must not exist; the desktop host is Electron/TypeScript.
 *
 * Run via: npm run lint (after tsc --noEmit).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const issues: string[] = [];

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function readImports(content: string) {
  const fromImports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const sideEffectImports = [...content.matchAll(/import\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  const dynamicImports = [...content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
    (match) => match[1],
  );

  return [...fromImports, ...sideEffectImports, ...dynamicImports];
}

function resolveLocalImport(filePath: string, specifier: string) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolved = path.resolve(path.dirname(filePath), specifier);
  const relative = path.relative(process.cwd(), resolved).replace(/\\/g, '/');

  return relative.startsWith('src/') ? relative : null;
}

function importTargets(importTargets: Array<string | null>, prefix: string) {
  return importTargets.some((target) => target === prefix || target?.startsWith(`${prefix}/`));
}

function isTestFile(relativePath: string) {
  return /\.(test|spec)\.(ts|tsx)$/.test(relativePath);
}

function readFileIfExists(relativePath: string) {
  const absolutePath = path.resolve(relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
}

function readInterfaceBlock(content: string, interfaceName: string) {
  const match = content.match(
    new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );
  return match?.[1] ?? '';
}

for (const filePath of walk(ROOT)) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = readImports(content);
  const localImportTargets = imports.map((specifier) => resolveLocalImport(filePath, specifier));

  if (relativePath.startsWith('src/core/')) {
    if (imports.some((specifier) => specifier === 'react' || specifier.startsWith('react/'))) {
      issues.push(`${relativePath}: core must not import React`);
    }

    if (imports.some((specifier) => specifier === 'zustand' || specifier.startsWith('zustand/'))) {
      issues.push(`${relativePath}: core must not import Zustand`);
    }

    if (
      importTargets(localImportTargets, 'src/web') ||
      importTargets(localImportTargets, 'src/extension') ||
      importTargets(localImportTargets, 'src/desktop') ||
      importTargets(localImportTargets, 'src/cli')
    ) {
      issues.push(`${relativePath}: core must not import host or UI layers`);
    }

    if (!isTestFile(relativePath)) {
      for (const globalPattern of [
        'window.',
        'document.',
        'navigator.',
        'chrome.',
        'globalThis',
        'fetch(',
        'btoa(',
        'WindowEventMap',
        'instanceof File',
        'file: File',
        'source: File',
        'as File',
      ]) {
        if (content.includes(globalPattern)) {
          issues.push(
            `${relativePath}: core must not use runtime globals or DOM types (${globalPattern})`,
          );
        }
      }
    }
  }

  if (relativePath.startsWith('src/web/')) {
    if (
      importTargets(localImportTargets, 'src/extension') ||
      importTargets(localImportTargets, 'src/desktop') ||
      importTargets(localImportTargets, 'src/cli')
    ) {
      issues.push(`${relativePath}: web must not import host adapters`);
    }

    if (content.includes('globalThis') || content.includes('chrome.')) {
      issues.push(`${relativePath}: web must not access host globals directly`);
    }
  }

  if (
    relativePath.startsWith('src/extension/') &&
    !relativePath.startsWith('src/extension/bootstrap/')
  ) {
    if (importTargets(localImportTargets, 'src/web')) {
      issues.push(`${relativePath}: extension adapters must not import web`);
    }
  }

  if (relativePath.startsWith('src/extension/')) {
    if (
      importTargets(localImportTargets, 'src/desktop') ||
      importTargets(localImportTargets, 'src/cli')
    ) {
      issues.push(`${relativePath}: extension must not import desktop or cli`);
    }
  }

  if (relativePath.startsWith('src/desktop/')) {
    if (
      importTargets(localImportTargets, 'src/extension') ||
      importTargets(localImportTargets, 'src/cli')
    ) {
      issues.push(`${relativePath}: desktop must not import extension or cli`);
    }

    if (
      relativePath !== 'src/desktop/renderer.tsx' &&
      importTargets(localImportTargets, 'src/web')
    ) {
      issues.push(`${relativePath}: only desktop renderer may import the web app`);
    }
  }

  if (relativePath.startsWith('src/cli/')) {
    if (
      importTargets(localImportTargets, 'src/web') ||
      importTargets(localImportTargets, 'src/extension') ||
      importTargets(localImportTargets, 'src/desktop')
    ) {
      issues.push(`${relativePath}: cli must depend on core, not host or UI layers`);
    }
  }

  if (relativePath.startsWith('src/web/widgets/')) {
    if (
      imports.some(
        (specifier) =>
          specifier === 'sonner' || specifier.includes('/store/') || specifier.includes('/stores/'),
      )
    ) {
      issues.push(`${relativePath}: widgets must not import stores or toast libraries`);
    }

    if (
      importTargets(localImportTargets, 'src/extension') ||
      importTargets(localImportTargets, 'src/desktop') ||
      importTargets(localImportTargets, 'src/cli')
    ) {
      issues.push(`${relativePath}: widgets must not import host adapters`);
    }
  }

  if (relativePath.startsWith('src/web/app/')) {
    for (const specifier of imports) {
      if (/\.\.\/features\/[^/]+\/(ui|hooks)\//.test(specifier)) {
        issues.push(
          `${relativePath}: import ${specifier} - use feature root (../features/<name>) so public API stays in index.ts`,
        );
      }
    }
  }

  if (relativePath.startsWith('src/web/features/')) {
    if (/use[A-Za-z]+Store\.getState\(/.test(content)) {
      issues.push(`${relativePath}: features must not read store singletons directly`);
    }

    if (
      /import\s+\{\s*toast\b/.test(content) ||
      /\btoast\.(success|message|error)\(/.test(content)
    ) {
      issues.push(`${relativePath}: features must present toast specs instead of importing toast`);
    }

    for (const specifier of imports) {
      const target = resolveLocalImport(filePath, specifier);

      if (target === 'src/web/app/ports' || target?.startsWith('src/web/app/ports/')) {
        issues.push(`${relativePath}: features must use app controllers/use-cases, not app ports`);
      }

      if (
        relativePath.includes('/ui/') &&
        (target === 'src/web/app/stores' ||
          target?.startsWith('src/web/app/stores/') ||
          target === 'src/web/app/use-cases' ||
          target?.startsWith('src/web/app/use-cases/') ||
          specifier === 'sonner')
      ) {
        issues.push(
          `${relativePath}: feature UI must use feature hooks/controllers instead of app stores, use-cases, ports, or sonner`,
        );
      }

      if (
        /\.\.\/\.\.\/[^/]+\/(ui|hooks)\//.test(specifier) &&
        !/\/app\//.test(specifier) &&
        !/\/core\//.test(specifier) &&
        !/\/widgets\//.test(specifier) &&
        !/\/web\/lib\//.test(specifier)
      ) {
        issues.push(
          `${relativePath}: import ${specifier} - import sibling features via ../<feature-name> (index.ts), not /ui/ or /hooks/`,
        );
      }
    }
  }

  if (relativePath === 'src/web/features/settings/ui/SettingsPanel.tsx') {
    const lineCount = content.split(/\r?\n/).length;

    if (lineCount > 180) {
      issues.push(`${relativePath}: settings shell must stay thin (${lineCount} lines, max 180)`);
    }

    if (
      imports.some(
        (specifier) =>
          specifier.includes('/use-cases/') ||
          specifier.includes('/presentation/') ||
          specifier.includes('/stores/usePreferencesStore') ||
          specifier === 'sonner',
      )
    ) {
      issues.push(`${relativePath}: settings shell must not own panel business dependencies`);
    }

    for (const embeddedPanel of ['ThemePanel', 'GeneralPanel', 'DataPanel', 'AboutPanel']) {
      if (content.includes(`function ${embeddedPanel}`)) {
        issues.push(`${relativePath}: ${embeddedPanel} must live in its own module`);
      }
    }
  }
}

for (const legacyPath of [
  'app',
  'domains',
  'features',
  'widgets',
  'lib',
  'integrations',
  'types',
]) {
  if (fs.existsSync(path.resolve('src', legacyPath))) {
    issues.push(`src/${legacyPath} should not exist in the multi-host architecture`);
  }
}

if (fs.existsSync(path.resolve('companion', 'windows'))) {
  issues.push('companion/windows should not exist; desktop must stay Electron/TypeScript');
}

const workspaceModel = readFileIfExists('src/core/domains/workspace/model/workspace.ts');
if (workspaceModel) {
  const boxEntityBlock = readInterfaceBlock(workspaceModel, 'WorkspaceBoxEntity');

  for (const forbiddenField of [
    'bounds',
    'layout',
    'zIndex',
    'isLocked',
    'isCollapsed',
    'isMinimized',
    'items',
  ]) {
    if (new RegExp(`\\b${forbiddenField}\\s*:`).test(boxEntityBlock)) {
      issues.push(
        `src/core/domains/workspace/model/workspace.ts: WorkspaceBoxEntity must not own ${forbiddenField}`,
      );
    }
  }
}

const itemModel = readFileIfExists('src/core/domains/items/model/item.ts');
if (itemModel) {
  for (const interfaceName of [
    'WorkspaceItemBase',
    'UrlWorkspaceItem',
    'NoteWorkspaceItem',
    'FileWorkspaceItem',
    'FolderWorkspaceItem',
  ]) {
    const itemBlock = readInterfaceBlock(itemModel, interfaceName);

    for (const forbiddenField of ['content', 'isPinned']) {
      if (new RegExp(`\\b${forbiddenField}\\s*:`).test(itemBlock)) {
        issues.push(
          `src/core/domains/items/model/item.ts: ${interfaceName} must not own ${forbiddenField}`,
        );
      }
    }
  }
}

if (issues.length > 0) {
  console.error('Architecture guard failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }

  process.exit(1);
}

console.log('Architecture guard passed.');
