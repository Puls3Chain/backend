#!/usr/bin/env node
// scripts/validate-postman-collection.mjs
//
// Lightweight structural validator for the Postman artifacts that ship in
// this repository. Runs in <300ms, no external dependencies, and is wired
// into `lint-staged` so a malformed collection can never accidentally land
// on the default branch via a "format only" commit.
//
// Scope:
//   * Every *.json under postman/ parses as JSON.
//   * Files named like a Postman collection have an `info` block plus a
//     top-level `item` array and an `auth` helper (collection-level auth
//     is one of the issue #61 acceptance criteria).
//   * Files named like a Postman environment expose a `_postman_variable_scope`
//     and a non-empty `values` array.
//
// Exits non-zero on the first failure so the lint-staged hook fails fast.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..');
const targetDirs = [join(root, 'postman')];

const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (extname(entry) === '.json') {
      out.push(full);
    }
  }
  return out;
}

function isCollectionShape(obj) {
  return obj && typeof obj === 'object' && Array.isArray(obj.item) && obj.info;
}

function isEnvironmentShape(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    obj._postman_variable_scope === 'environment' &&
    Array.isArray(obj.values) &&
    obj.values.length > 0
  );
}

for (const dir of targetDirs) {
  let files = [];
  try {
    files = walk(dir);
  } catch (err) {
    errors.push(`Cannot read ${dir}: ${err.message}`);
    continue;
  }

  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(`${file}: invalid JSON — ${err.message}`);
      continue;
    }

    const lower = file.toLowerCase();
    if (lower.endsWith('.postman_collection.json')) {
      if (!isCollectionShape(parsed)) {
        errors.push(
          `${file}: collection is missing top-level 'info' or 'item' array`,
        );
      } else if (!parsed.auth) {
        errors.push(
          `${file}: collection is missing the collection-level 'auth' helper (issue #61 acceptance criterion)`,
        );
      }
    } else if (lower.includes('environments/')) {
      if (!isEnvironmentShape(parsed)) {
        errors.push(
          `${file}: environment is missing _postman_variable_scope='environment' or an empty 'values' array`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`[validate-postman] ${err}`);
  }
  console.error(`[validate-postman] ${errors.length} error(s) found`);
  process.exit(1);
}

console.log(
  '[validate-postman] OK — all Postman artifacts parse and have the expected shape',
);
