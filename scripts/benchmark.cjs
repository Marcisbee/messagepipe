// Fix the date workload's timezone across hosts.
process.env.TZ = 'UTC';

const assert = require('node:assert/strict');
const { cpus } = require('node:os');
const { resolve } = require('node:path');
const { performance } = require('node:perf_hooks');
const bundle = resolve(process.argv[2] || 'dist/index.js');
const { MessagePipe, intlTransformers } = require(bundle);

const warmup = 1000;
const iterations = 10000;
const repeats = 5;
const results = [];
for (const [name, template, value, expected] of [
  ['number', '{x|number,style:"currency",currency:"EUR"}', 1234.5, '€1,234.50'],
  ['date', '{x|date}', 0, '01/01/1970'],
  ['plural', '{x|plural,one:"one",other:"# items"}', 5, '5 items'],
]) {
  const render = MessagePipe(intlTransformers('en-GB')).compile(template);
  const props = { x: value };
  assert.equal(render(props), expected);
  for (let i = 0; i < warmup; i++) render(props);
  const samples = [];
  let output;
  for (let sample = 0; sample < repeats; sample++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) output = render(props);
    samples.push(performance.now() - start);
    assert.equal(output, expected);
  }
  const median = [...samples].sort((a, b) => a - b)[Math.floor(repeats / 2)];
  results.push({ name, template, value, samples_ms: samples, median_ms: median });
}
console.log(JSON.stringify({
  bundle, node: process.version, icu: process.versions.icu,
  platform: process.platform, arch: process.arch, cpu: cpus()[0].model,
  locale: 'en-GB', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  warmup, iterations, repeats, results,
}, null, 2));
