const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// Exercise the package export map, rather than importing a source file.
for (const [mode, load] of [
  ['commonjs', "const { MessagePipe } = require('messagepipe');"],
  ['module', "import { MessagePipe } from 'messagepipe';"],
]) {
  const result = spawnSync(process.execPath, [
    `--input-type=${mode}`, '-e',
    `${load} console.log(MessagePipe().compile('Hello {name}')({ name: 'Ada' }));`,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'Hello Ada');
}
console.log('CommonJS and ESM package imports passed');
