import { test } from 'uvu';
import assert from 'uvu/assert';
import { MessagePipe, defaultTransformers, intlTransformers } from './index';

for (const method of ['compile', 'compileRaw'] as const) {
  test(`${method} isolates transformers and accepts prototype-named messages`, () => {
    const first = MessagePipe({ label: () => 'first' });
    const second = MessagePipe({ label: () => 'second' });
    const output = (value: string) => method === 'compile' ? value : ['', value, ''];
    assert.equal(first[method]('{x|label}')({}), output('first'));
    assert.equal(second[method]('{x|label}')({}), output('second'));
    for (const text of ['constructor', 'toString', '__proto__']) {
      assert.equal(first[method](text)(), method === 'compile' ? text : [text]);
    }
  });
}

test('quoted arguments and selectors preserve delimiters and escapes', () => {
  const pipe = MessagePipe(defaultTransformers());
  assert.equal(pipe.compile('{x|select,other:"a,b:c|d{e}"}')({}), 'a,b:c|d{e}');
  assert.equal(pipe.compile(String.raw`{x|select,other:"say \"hi\""}`)({}), 'say "hi"');
  assert.equal(pipe.compile('{["a|b,c:d}"]}')({ 'a|b,c:d}': 'found' }), 'found');
  assert.equal(pipe.compile(String.raw`\\{name}`)({ name: 'Ada' }), '\\Ada');
});

test('select preserves empty choices and ignores inherited keys', () => {
  const pipe = MessagePipe(defaultTransformers());
  const message = pipe.compile('{x|select,empty:"",other:"fallback"}');
  assert.equal(message({ x: 'empty' }), '');
  assert.equal(message({ x: 'toString' }), 'fallback');
});

test('Intl options reach formatters and plural falls back and replaces every marker', () => {
  const pipe = MessagePipe(intlTransformers('en-GB'));
  assert.equal(pipe.compile('{x|number,minimumFractionDigits:2}')({ x: 1 }), '1.00');
  assert.equal(pipe.compile('{x|date,year:"2-digit",month:"long",day:"2-digit",timeZone:"UTC"}')({ x: 0 }), '01 January 70');
  assert.equal(pipe.compile('{x|time,hour12:false,timeZone:"UTC"}')({ x: 0 }), '00:00:00');
  assert.equal(pipe.compile('{x|plural,other:"# of #"}')({ x: 1 }), '1 of 1');
  assert.equal(pipe.compile('{x|plural,one:"one",other:"many",minimumFractionDigits:2}')({ x: 1 }), 'many');
});

test('formatter reuse respects changing options and locale isolation', () => {
  const gb = MessagePipe(intlTransformers('en-GB'));
  const de = MessagePipe(intlTransformers('de-DE'));
  const text = '{x|number,minimumFractionDigits:{digits}}';
  const render = gb.compile(text);
  assert.equal(render({ x: 1.5, digits: 2 }), '1.50');
  assert.equal(render({ x: 1.5, digits: 3 }), '1.500');
  assert.equal(render({ x: 1.5, digits: 2 }), '1.50');
  assert.equal(de.compile(text)({ x: 1.5, digits: 2 }), '1,50');
});

test('omitted props behave like an empty props object', () => {
  const pipe = MessagePipe();
  assert.equal(pipe.compile('Hello {name}')(), 'Hello undefined');
  assert.equal(pipe.compileRaw('{name}')(), ['', undefined, '']);
});

for (const [type, milliseconds, expected] of [
  ['second', 1000, 'in 1 second'],
  ['minutes', -60000, '1 minute ago'],
  ['hour', 3600000, 'in 1 hour'],
  ['day', 86400000, 'in 1 day'],
  ['week', 604800000, 'in 1 week'],
  ['month', 2592000000, 'in 1 month'],
  ['quarter', 7776000000, 'in 1 quarter'],
  ['year', 31536000000, 'in 1 year'],
] as const) {
  test(`relativeTime converts milliseconds to ${type}`, () => {
    const render = MessagePipe(intlTransformers('en-GB')).compile('{x|relativeTime,type:{unit}}');
    assert.equal(render({ x: milliseconds, unit: type }), expected);
  });
}

test('raw compilation preserves values and bypassed caches stay independent', () => {
  const object = { id: 1 };
  const pipe = MessagePipe({ identity: value => value }, { disableCache: true });
  assert.equal(pipe.compileRaw('{x|identity}')({ x: object }), ['', object, '']);
  assert.is.not(pipe.compile('x'), pipe.compile('x'));
  assert.is.not(pipe.compileRaw('x'), pipe.compileRaw('x'));
});

test.run();
