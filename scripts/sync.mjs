#!/usr/bin/env node
/**
 * Mirror topia's skills/ into this Hermes package.
 *
 * Usage: node scripts/sync.mjs [--topia <path>] [--accept]
 *
 *   --topia   path to a topia checkout (default: ../topia beside this repo)
 *   --accept  record the current upstream hash of every override after you
 *             have re-reviewed the local rewording against upstream's changes
 *
 * Files listed in overrides.json are kept as-is: their wording differs from
 * upstream (see README "Differences from topia"). Each entry records the
 * sha256 of the upstream file it was reworded from; when upstream moves, the
 * sync exits 1 and names the file so the rewording can be redone.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const topiaArg = args.indexOf('--topia');
const topiaRoot = resolve(topiaArg >= 0 ? args[topiaArg + 1] : join(repoRoot, '..', 'topia'));
const accept = args.includes('--accept');

const toPosix = (p) => p.split(sep).join('/');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const upstreamSkills = join(topiaRoot, 'skills');
if (!existsSync(upstreamSkills)) {
  console.error(`topia skills not found at ${upstreamSkills} (pass --topia <path>)`);
  process.exit(1);
}

const overridesPath = join(repoRoot, 'overrides.json');
const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
const upstreamFiles = new Set(walk(upstreamSkills).map((f) => toPosix(relative(topiaRoot, f))));

// Drop local files upstream no longer ships.
const localSkills = join(repoRoot, 'skills');
if (existsSync(localSkills)) {
  for (const f of walk(localSkills)) {
    const rel = toPosix(relative(repoRoot, f));
    if (!upstreamFiles.has(rel) && !overrides[rel]) rmSync(f);
  }
}

let copied = 0;
const stale = [];
for (const rel of [...upstreamFiles].sort()) {
  const src = join(topiaRoot, rel);
  const dest = join(repoRoot, rel);
  const override = overrides[rel];
  if (override && existsSync(dest)) {
    const hash = sha256(src);
    if (accept) override.upstream_sha256 = hash;
    else if (override.upstream_sha256 !== hash) stale.push(rel);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  copied++;
  if (override) stale.push(`${rel} (fresh upstream copy, needs rewording)`);
}

for (const rel of Object.keys(overrides)) {
  if (!upstreamFiles.has(rel)) stale.push(`${rel} (removed upstream)`);
}

const version = JSON.parse(readFileSync(join(topiaRoot, 'package.json'), 'utf8')).version;
const pluginPath = join(repoRoot, 'plugin.json');
const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
plugin.version = version;
writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
if (accept) writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);

console.log(`synced ${copied} files from topia ${version}; ${Object.keys(overrides).length} overrides`);
if (stale.length && !accept) {
  console.error('\nThese overridden files need attention. Re-apply the rewording, then run with --accept:');
  for (const rel of stale) console.error(`  ${rel}`);
  process.exit(1);
}
