#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseWorkspaceExportDocument } from '../core/domains/workspace/model/workspaceCodec';

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

  const document = parseWorkspaceExportDocument(await readJson(inputPath));
  const itemCount = document.items.length;
  const placementCount = Object.values(document.itemPlacementsByBoxId).reduce(
    (total, placements) => total + placements.length,
    0,
  );

  console.log(
    JSON.stringify(
      {
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
