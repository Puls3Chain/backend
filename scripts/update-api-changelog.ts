import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function getPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

function runOpenApiDiff(prev: string, curr: string): string {
  try {
    const cmd = `npx openapi-diff ${prev} ${curr}`;
    return execSync(cmd, { encoding: 'utf8' });
  } catch (err: any) {
    return err.stdout || err.message || String(err);
  }
}

function prependChangelog(version: string, diff: string) {
  const changelogPath = join(process.cwd(), 'docs', 'API_CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `## v${version} - ${date}\n\n### Added\n\n-\n\n### Changed\n\n\n\n\n### Deprecated\n\n-\n\n### Removed\n\n-\n\n### Fixed\n\n-\n\n<details>\n<summary>OpenAPI diff (raw)</summary>\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n` + '\n```\n' + diff + '\n```\n\n';

  let existing = '';
  if (existsSync(changelogPath)) existing = readFileSync(changelogPath, 'utf8');

  writeFileSync(changelogPath, entry + '\n' + existing, 'utf8');
  console.log('Updated', changelogPath);
}

(function main() {
  const prev = process.argv[2] || 'docs/openapi/previous.json';
  const curr = process.argv[3] || 'docs/openapi/current.json';
  const diff = runOpenApiDiff(prev, curr);
  const version = getPackageVersion();
  prependChangelog(version, diff);
})();
