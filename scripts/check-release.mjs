import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const manifest = await json('manifest.json');
const pkg = await json('package.json');
const lock = await json('package-lock.json');
const versions = await json('versions.json');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Release versions must be x.y.z, without v');
assert.equal(pkg.version, manifest.version, 'package and manifest version must match');
assert.equal(lock.version, manifest.version, 'lockfile version must match');
assert.equal(lock.packages[''].version, manifest.version, 'lockfile root version must match');
assert.equal(versions[manifest.version], manifest.minAppVersion, 'versions.json must declare this version and minimum app version');
assert.equal(manifest.id, 'markdown-wechat-publisher');
if (process.env.GITHUB_REF_TYPE === 'tag') {
    assert.equal(process.env.GITHUB_REF_NAME, manifest.version, 'Git tag must exactly match manifest.version');
}
for (const path of ['main.js', 'manifest.json', 'styles.css']) assert.ok((await stat(path)).size > 0, path + ' must not be empty');
assert.doesNotMatch(await readFile('styles.css', 'utf8'), /@import\s/, 'CSS imports must be bundled locally');
console.log('PASS release metadata and assets: ' + manifest.version);
