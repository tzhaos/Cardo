import fs from 'node:fs';
import path from 'node:path';
import {
  migrateLegacyWorkspaceDocument,
  migrateLegacyWorkspaceSnapshot,
} from '../src/app/migrations/workspaceMigration';

function resolveOutputPath(inputPath: string, outputPath: string | undefined, useSnapshot: boolean) {
  if (outputPath) {
    return path.resolve(outputPath);
  }

  const extension = useSnapshot ? '.snapshot-v3.json' : '.export-v2.json';
  return `${inputPath}${extension}`;
}

function main() {
  const args = process.argv.slice(2);
  const useSnapshot = args.includes('--snapshot');
  const positionalArgs = args.filter((argument) => argument !== '--snapshot');
  const [inputPath, outputPath] = positionalArgs;

  if (!inputPath) {
    throw new Error('Usage: npm run migrate:workspace -- <input.json> [output.json] [--snapshot]');
  }

  const absoluteInputPath = path.resolve(inputPath);
  const absoluteOutputPath = resolveOutputPath(absoluteInputPath, outputPath, useSnapshot);
  const input = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8')) as unknown;
  const output = useSnapshot
    ? migrateLegacyWorkspaceSnapshot(input)
    : migrateLegacyWorkspaceDocument(input);

  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Migrated workspace written to ${absoluteOutputPath}`);
}

main();
