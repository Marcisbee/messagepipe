import { suite } from 'uvu';
import assert from 'uvu/assert';

import { format, formatRaw } from './messagepipe';

const testFormat = suite('format');
const testFormatRaw = suite('formatRaw');

testFormat('exports `format`', () => {
  assert.instance(format, Function);
});

([
  ['', ''],
  ['0', '0'],
  ['1', '1'],
  ['a', 'a'],
  ['Hello world!', 'Hello world!'],
  ['Hello {name}!', 'Hello !'],
  ['Hello {name}!', 'Hello !', {}],
  ['Hello {name}!', 'Hello !', { name: null }],
  ['Hello {name}!', 'Hello !', { name: undefined }],
  ['Hello {name}!', 'Hello NaN!', { name: NaN }],
  // @TODO: Fix this:
  // ['Hello {name}!', 'Hello !', { name: Number }],
  ['Hello {name}!', 'Hello 0!', { name: 0 }],
  ['Hello {name}!', 'Hello 1!', { name: 1 }],
  ['Hello {name}!', 'Hello 5!', { name: Number(5) }],
  ['Hello {name}!', 'Hello false!', { name: false }],
  ['Hello {name}!', 'Hello true!', { name: true }],
  ['Hello {name}!', 'Hello !', { name: '' }],
  ['Hello {name}!', 'Hello Mars!', { name: 'Mars' }],
  ['Hello {planet.name}!', 'Hello !', { planet: {} }],
  ['Hello {planet.name}!', 'Hello Jupiter!', { planet: { name: 'Jupiter' } }],
  ['Hello {planets.0.name}!', 'Hello Venus!', { planets: [{ name: 'Venus' }] }],
  ['Hello {planets.*.name}!', 'Hello Venus,Mercury!', { planets: [{ name: 'Venus' }, { name: 'Mercury' }] }],
] as const).forEach(([input, output, props]) => {
  testFormat(`returns ${JSON.stringify(output)}`, () => {
    assert.equal(format(input, props), output);
  });
});

const transformers = {
  json: JSON.stringify,
};

([
  ['{name | json}', '', {}, transformers],
  ['{name | json}', '"Moracco"', { name: 'Moracco' }, transformers],
  ['{name | json | json}', '"\\"Moracco\\""', { name: 'Moracco' }, transformers],
] as const).forEach(([input, output, props, transformers]) => {
  testFormat(`returns transformed value ${JSON.stringify(output)}`, () => {
    assert.equal(format(input, props, transformers), output);
  });
});

// ----

testFormatRaw('exports `formatRaw`', () => {
  assert.instance(formatRaw, Function);
});

// @TODO: Tests for raw

testFormat.run();
testFormatRaw.run();
