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
  return [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

for (const filePath of walk(ROOT)) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = readImports(content);

  if (relativePath.startsWith('src/domains/')) {
    const isTestFile = /\.(test|spec)\.(ts|tsx)$/.test(relativePath);

    if (imports.some((specifier) => specifier === 'react' || specifier.startsWith('react/'))) {
      issues.push(`${relativePath}: domains must not import React`);
    }

    if (imports.some((specifier) => specifier === 'zustand' || specifier.startsWith('zustand/'))) {
      issues.push(`${relativePath}: domains must not import Zustand`);
    }

    if (!isTestFile) {
      for (const globalPattern of ['window.', 'document.', 'navigator.', 'chrome.']) {
        if (content.includes(globalPattern)) {
          issues.push(
            `${relativePath}: domains must not use browser runtime globals (${globalPattern})`,
          );
        }
      }
    }
  }

  if (relativePath.startsWith('src/widgets/')) {
    if (
      imports.some(
        (specifier) =>
          specifier === 'sonner' ||
          specifier.includes('/store/') ||
          specifier.includes('app/stores'),
      )
    ) {
      issues.push(`${relativePath}: widgets must not import stores or toast libraries`);
    }

    if (
      imports.some(
        (specifier) => specifier.includes('/extension/') || specifier.includes('/integrations/'),
      )
    ) {
      issues.push(`${relativePath}: widgets must not import extension or integration adapters`);
    }
  }

  if (relativePath.startsWith('src/app/')) {
    for (const specifier of imports) {
      if (/\.\.\/features\/[^/]+\/(ui|hooks)\//.test(specifier)) {
        issues.push(
          `${relativePath}: import ${specifier} — use feature root (../features/<name>) so public API stays in index.ts`,
        );
      }
    }
  }

  if (relativePath.startsWith('src/features/')) {
    for (const specifier of imports) {
      if (
        /\.\.\/\.\.\/[^/]+\/(ui|hooks)\//.test(specifier) &&
        !/\/app\//.test(specifier) &&
        !/\/domains\//.test(specifier) &&
        !/\/widgets\//.test(specifier) &&
        !/\/extension\//.test(specifier) &&
        !/\/integrations\//.test(specifier) &&
        !/\/lib\//.test(specifier)
      ) {
        issues.push(
          `${relativePath}: import ${specifier} — import sibling features via ../<feature-name> (index.ts), not /ui/ or /hooks/`,
        );
      }
    }
  }
}

if (fs.existsSync(path.resolve('src/types'))) {
  issues.push('src/types should not exist after the architecture rebuild');
}

if (issues.length > 0) {
  console.error('Architecture guard failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }

  process.exit(1);
}

console.log('Architecture guard passed.');
