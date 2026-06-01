#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  migrateLegacyWorkspaceDocument,
  migrateLegacyWorkspaceSnapshot,
} from '../core/migrations/workspaceMigration';
import { parseWorkspaceExportDocument } from '../core/domains/workspace/model/workspaceCodec';

function printUsage() {
  console.log(`Usage:
  khaosbox migrate <input.json> [output.json] [--snapshot]
  khaosbox inspect <workspace-export.json>`);
}

function resolveOutputPath(
  inputPath: string,
  outputPath: string | undefined,
  useSnapshot: boolean,
) {
  if (outputPath) {
    return path.resolve(outputPath);
  }

  const extension = useSnapshot ? '.snapshot-v5.json' : '.export-v3.json';
  return `${inputPath}${extension}`;
}

async function readJson(filePath: string) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8')) as unknown;
}

async function migrate(args: string[]) {
  const useSnapshot = args.includes('--snapshot');
  const positionalArgs = args.filter((argument) => argument !== '--snapshot');
  const [inputPath, outputPath] = positionalArgs;

  if (!inputPath) {
    throw new Error('Missing input file.');
  }

  const absoluteInputPath = path.resolve(inputPath);
  const absoluteOutputPath = resolveOutputPath(absoluteInputPath, outputPath, useSnapshot);
  const input = await readJson(absoluteInputPath);
  const output = useSnapshot
    ? migrateLegacyWorkspaceSnapshot(input)
    : migrateLegacyWorkspaceDocument(input);

  await fs.writeFile(absoluteOutputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Migrated workspace written to ${absoluteOutputPath}`);
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

  if (command === 'migrate') {
    await migrate(args);
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
