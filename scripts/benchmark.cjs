// Fix the date workload's timezone across hosts.
process.env.TZ = 'UTC';

const assert = require('node:assert/strict');
const { cpus } = require('node:os');
const { resolve } = require('node:path');
const { performance } = require('node:perf_hooks');
const MessageFormat = require('@messageformat/core');
const varied = process.argv.includes('--varied');
const bundle = resolve(process.argv.slice(2).find(arg => arg !== '--varied') || 'dist/index.js');
const { MessagePipe, defaultTransformers, intlTransformers } = require(bundle);
const pipe = MessagePipe({ ...defaultTransformers(), ...intlTransformers('en-GB') });
const messageformat = new MessageFormat('en-GB');

const warmup = 10000;
const iterations = 1000000;
const repeats = 7;
const workloads = [
  ['plain', 'Wow', 'Wow', [[{}, 'Wow']]],
  ['interpolation', 'Hello {planet}', 'Hello {planet}', [
    [{ planet: 'Mars' }, 'Hello Mars'], [{ planet: 'Venus' }, 'Hello Venus'],
    [{ planet: 'Earth' }, 'Hello Earth'],
  ]],
  ['select', '{gender|select,male:"He",female:"She",other:"They"} liked this.',
    '{gender, select, male{He} female{She} other{They}} liked this.', [
      [{ gender: 'male' }, 'He liked this.'], [{ gender: 'female' }, 'She liked this.'],
      [{ gender: 'other' }, 'They liked this.'],
    ]],
  ['number', '{x|number,style:"currency",currency:"EUR"}', '{x, number, ::currency/EUR}', [
    [{ x: 1234.5 }, '€1,234.50'], [{ x: 0 }, '€0.00'], [{ x: -42 }, '-€42.00'],
  ]],
  ['date', '{x|date}', '{x, date, ::ddMMyyyy}', [
    [{ x: 0 }, '01/01/1970'], [{ x: 86400000 }, '02/01/1970'],
    [{ x: 172800000 }, '03/01/1970'],
  ]],
  ['plural', '{x|plural,one:"one",other:"# items"}', '{x, plural, one{one} other{# items}}', [
    [{ x: 0 }, '0 items'], [{ x: 1 }, 'one'], [{ x: 5 }, '5 items'],
  ]],
];

if (varied) {
  const number = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
  const date = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' });
  for (const workload of workloads) {
    const [name] = workload;
    if (name === 'number' || name === 'date' || name === 'plural') {
      workload[3] = Array.from({ length: 1000 }, (_, i) => {
        const x = name === 'date' ? i * 86400000 : name === 'plural' ? i : i + 1000;
        return [{ x }, name === 'number' ? number.format(x) : name === 'date' ? date.format(x) : x === 1 ? 'one' : x + ' items'];
      });
    }
  }
}

function run(render, cases, count) {
  let checksum = 0;
  for (let i = 0; i < count; i++) checksum += render(cases[i % cases.length][0]).length;
  return checksum;
}

const results = [];
for (const [name, pipeTemplate, mfTemplate, cases] of workloads) {
  const renderers = {
    messagepipe: pipe.compile(pipeTemplate),
    messageformat: messageformat.compile(mfTemplate),
  };
  for (const render of Object.values(renderers)) {
    for (const [props, expected] of cases) assert.equal(render(props), expected);
    run(render, cases, warmup);
  }
  const cycleLength = cases.reduce((sum, [, expected]) => sum + expected.length, 0);
  const expectedChecksum = Math.floor(iterations / cases.length) * cycleLength
    + cases.slice(0, iterations % cases.length).reduce((sum, [, expected]) => sum + expected.length, 0);
  const samples = { messagepipe: [], messageformat: [] };
  for (let sample = 0; sample < repeats; sample++) {
    // Alternate measurement order to reduce systematic warmup/order bias.
    const order = sample % 2 ? ['messageformat', 'messagepipe'] : ['messagepipe', 'messageformat'];
    for (const library of order) {
      const start = performance.now();
      const checksum = run(renderers[library], cases, iterations);
      samples[library].push(performance.now() - start);
      assert.equal(checksum, expectedChecksum);
    }
  }
  const timings = {};
  for (const [library, values] of Object.entries(samples)) {
    const median = [...values].sort((a, b) => a - b)[Math.floor(repeats / 2)];
    timings[library] = { samples_ms: values, median_ms: median, ops_per_second: iterations * 1000 / median };
  }
  results.push({ name, messagepipe_template: pipeTemplate, messageformat_template: mfTemplate, cases, timings });
}
console.log(JSON.stringify({
  bundle, messageformat: `@messageformat/core@${require('@messageformat/core/package.json').version}`,
  node: process.version, icu: process.versions.icu,
  platform: process.platform, arch: process.arch, cpu: cpus()[0].model,
  locale: 'en-GB', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  varied, warmup, iterations, repeats, results,
}, null, 2));
