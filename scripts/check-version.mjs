import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(pkg.version)) {
  throw new Error(
    'Use main.sub.ninor: exactly three non-negative integers without leading zeroes.',
  );
}
if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
  throw new Error('package.json and package-lock.json versions must match.');
}
if (
  !read('CHANGELOG.md')
    .split('\n')
    .some((line) => line.startsWith(`## ${pkg.version} — `))
) {
  throw new Error(`Add a CHANGELOG.md entry for ${pkg.version}.`);
}
if (!read('README.md').includes(`**v${pkg.version}**`)) {
  throw new Error(`Update the README version to v${pkg.version}.`);
}
console.log(`Release metadata is consistent: ${pkg.version}`);
