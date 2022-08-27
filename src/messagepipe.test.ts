import { suite } from 'uvu';
import assert from 'uvu/assert';

import { MessagePipe } from './messagepipe';

const testCompile = suite('compile');
const testCompileRaw = suite('compileRaw');

testCompile('exports `MessagePipe`', () => {
  assert.instance(MessagePipe, Function);
});

const messagePipe = MessagePipe({});

testCompile('contains `compile`', () => {
  assert.instance(messagePipe.compile, Function);
});

([
  ['', ''],
  ['0', '0'],
  ['1', '1'],
  ['a', 'a'],
  ['Hello world!', 'Hello world!'],
  ['Hello {name}!', 'Hello undefined!', {}],
  ['Hello {name}!', 'Hello null!', { name: null }],
  ['Hello {name}!', 'Hello undefined!', { name: undefined }],
  ['Hello {name}!', 'Hello NaN!', { name: NaN }],
  ['Hello {name}!', 'Hello 0!', { name: 0 }],
  ['Hello {name}!', 'Hello 1!', { name: 1 }],
  ['Hello {name}!', 'Hello 5!', { name: Number(5) }],
  ['Hello {name}!', 'Hello false!', { name: false }],
  ['Hello {name}!', 'Hello true!', { name: true }],
  ['Hello {name}!', 'Hello !', { name: '' }],
  ['Hello {name}!', 'Hello Mars!', { name: 'Mars' }],
  ['Hello {planet.name}!', 'Hello undefined!', { planet: {} }],
  ['Hello {planet.name}!', 'Hello Jupiter!', { planet: { name: 'Jupiter' } }],
  ['Hello {planets[0].name}!', 'Hello Venus!', { planets: [{ name: 'Venus' }] }],
] as const).forEach(([input, output, props]) => {
  testCompile(`returns ${JSON.stringify(output)}`, () => {
    assert.equal(messagePipe.compile(input)(props), output);
  });
});

const transformers = {
  json: JSON.stringify,
  capitalize: (value) => value[0].toUpperCase() + value.slice(1).toLowerCase(),
  sub: (value, { by = 0 } = {}) => Number(value) - by,
};

([
  ['{name | json}', 'undefined', {}, transformers],
  ['{name | json}', '"Moracco"', { name: 'Moracco' }, transformers],
  ['{name | json | json}', '"\\"Moracco\\""', { name: 'Moracco' }, transformers],
  [
    'Hello {agents.{index}.first_name | capitalize}!',
    'Hello John!',
    {
      agents: [
        {
          first_name: 'jade',
          last_name: 'smith',
        },
        {
          first_name: 'john',
          last_name: 'wick',
        },
      ],
      index: 1,
    },
    transformers,
  ],
  [
    'Hello {agents.{index | sub, by:1}.first_name | capitalize}!',
    'Hello Jade!',
    {
      agents: [
        {
          first_name: 'jade',
          last_name: 'smith',
        },
        {
          first_name: 'john',
          last_name: 'wick',
        },
      ],
      index: 1,
    },
    transformers,
  ],
] as const).forEach(([input, output, props, transformers]) => {
  const messagePipeWithTransformers = MessagePipe(transformers);

  testCompile(`returns transformed value ${JSON.stringify(output)}`, () => {
    assert.equal(messagePipeWithTransformers.compile(input)(props), output);
  });
});

// ----

testCompileRaw('contains `compileRaw`', () => {
  assert.instance(messagePipe.compileRaw, Function);
});

// @TODO: Tests for raw

testCompile.run();
testCompileRaw.run();
