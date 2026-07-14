#!/usr/bin/env node
/**
 * Recreate host discovery links into .spec/ for Claude Code / Codex.
 *
 * - POSIX: directory symlinks (same as git 120000 entries)
 * - Windows without SeCreateSymbolicLink: directory junctions (mklink /J)
 *
 * Run after clone / pull when `node .spec/tools/spec-lint.mjs` reports broken links.
 * Does not write into git; working-tree only.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const links = [
  { rel: '.claude/agents', target: '../.spec/agents' },
  { rel: '.claude/skills', target: '../.spec/skills' },
  { rel: '.agents/skills', target: '../.spec/skills' },
]

function removeIfPresent(abs) {
  if (!existsSync(abs)) return
  const st = lstatSync(abs)
  // file stub from core.symlinks=false checkout, or empty dir / reparse point
  rmSync(abs, { recursive: true, force: true })
  if (st.isSymbolicLink?.() || st.isFile()) {
    // rmSync handles both
  }
}

function trySymlink(absLink, relTarget) {
  symlinkSync(relTarget, absLink, 'dir')
}

function makeJunction(absLink, absTarget) {
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', absLink, absTarget], {
    stdio: 'inherit',
    windowsHide: true,
  })
}

let mode = 'symlink'
for (const { rel, target } of links) {
  const absLink = join(root, rel)
  const absTarget = resolve(dirname(absLink), target)
  removeIfPresent(absLink)
  try {
    trySymlink(absLink, target)
    console.log(`ok symlink  ${rel} -> ${target}`)
  } catch (err) {
    if (process.platform !== 'win32') throw err
    mode = 'junction'
    makeJunction(absLink, absTarget)
    console.log(`ok junction ${rel} -> ${absTarget}`)
  }
}

console.log(`\nHost links ready (mode=${mode}). Verify with: node .spec/tools/spec-lint.mjs`)
if (mode === 'junction') {
  console.log(
    'Note: Windows junctions are local-only. Git still stores POSIX symlinks; re-run this script after clone/checkout if links break.',
  )
}
