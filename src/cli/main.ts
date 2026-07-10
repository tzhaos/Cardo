#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseWorkspaceExportDocument } from '../core/domains/workspace/model/workspaceCodec';
import { extractPersistedWorkspaceSnapshot } from '../web-next/domain/persistence';

function printUsage() {
  console.log(`Usage:
  khaosbox inspect <workspace-export.json>`);
}

async function readJson(filePath: string) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8')) as unknown;
}

async function inspect(args: string[]) {
  const [inputPath] = args;

  if (!inputPath) {
    throw new Error('Missing input file.');
  }

  const input = await readJson(inputPath);
  const webNextSnapshot = extractWebNextSnapshot(input);

  if (webNextSnapshot) {
    const itemCount = webNextSnapshot.boxes.reduce((total, box) => total + box.items.length, 0);
    const boxesByType = webNextSnapshot.boxes.reduce<Record<string, number>>((counts, box) => {
      counts[box.type] = (counts[box.type] ?? 0) + 1;
      return counts;
    }, {});

    console.log(
      JSON.stringify(
        {
          format: 'web-next',
          pages: webNextSnapshot.pages.length,
          boxes: webNextSnapshot.boxes.length,
          items: itemCount,
          boxesByType,
        },
        null,
        2,
      ),
    );
    return;
  }

  const document = parseWorkspaceExportDocument(input);
  const itemCount = document.items.length;
  const placementCount = Object.values(document.itemPlacementsByBoxId).reduce(
    (total, placements) => total + placements.length,
    0,
  );

  console.log(
    JSON.stringify(
      {
        format: 'legacy',
        version: document.version,
        boxes: document.boxes.length,
        items: itemCount,
        placements: placementCount,
      },
      null,
      2,
    ),
  );
}

function extractWebNextSnapshot(input: unknown) {
  if (
    typeof input === 'object' &&
    input !== null &&
    'khaosbox.web-next.workspace' in input &&
    typeof input['khaosbox.web-next.workspace'] === 'string'
  ) {
    try {
      return extractPersistedWorkspaceSnapshot(JSON.parse(input['khaosbox.web-next.workspace']));
    } catch {
      return null;
    }
  }

  return extractPersistedWorkspaceSnapshot(input);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'inspect') {
    await inspect(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
