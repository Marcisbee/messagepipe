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

test('number options preserve inherited and non-enumerable properties', () => {
  const { number } = intlTransformers('en-GB');
  assert.equal(number('0.5'), '0.5');
  assert.equal(number('0.5', Object.create({ style: 'percent' })), '50%');
  assert.equal(number('0.5', Object.defineProperty({}, 'style', { value: 'percent' })), '50%');
  assert.equal(number('0.5'), '0.5');
});

test('number options evaluate getters once per call', () => {
  const { number } = intlTransformers('en-GB');
  let reads = 0;
  const options = { get style() { return reads++ === 0 ? 'percent' : 'decimal'; } };
  assert.equal(number('0.5', options), '50%');
  assert.equal(reads, 1);
  assert.equal(number('0.5', options), '0.5');
  assert.equal(reads, 2);
});

test('prepared formatting preserves signed zero, mutable inputs and cache eviction', () => {
  const pipe = MessagePipe(intlTransformers('en-GB'));
  const number = pipe.compile('{x|number,minimumFractionDigits:2}');
  assert.equal(number({ x: 0 }), '0.00');
  assert.equal(number({ x: -0 }), '-0.00');
  assert.equal(number({ x: 0 }), '0.00');
  let amount = 1;
  const mutable = { valueOf: () => amount++ };
  assert.equal(number({ x: mutable }), '1.00');
  assert.equal(number({ x: mutable }), '2.00');
  for (let i = 1; i <= 110; i++) {
    assert.equal(number({ x: i }), i + '.00');
  }
  assert.equal(number({ x: 0 }), '0.00');
  const date = pipe.compile('{x|date,timeZone:"UTC"}');
  const instant = new Date(0);
  assert.equal(date({ x: instant }), '01/01/1970');
  instant.setUTCDate(2);
  assert.equal(date({ x: instant }), '02/01/1970');
});

test('compiled built-ins remain replaceable and custom options stay fresh', () => {
  const transformers = intlTransformers('en-GB');
  const original = transformers.number;
  const pipe = MessagePipe(transformers);
  const render = pipe.compile('{x|number,minimumFractionDigits:2}');
  assert.equal(render({ x: 1 }), '1.00');
  transformers.number = function(value, options) {
    assert.is(this, transformers);
    const digits = options.minimumFractionDigits;
    options.minimumFractionDigits = 9;
    return value + ':' + digits;
  };
  assert.equal(render({ x: 1 }), '1:2');
  assert.equal(render({ x: 2 }), '2:2');
  transformers.number = original;
  assert.equal(render({ x: 1 }), '1.00');
});

test('constant preparation stays lazy and dynamic arguments remain live', () => {
  const pipe = MessagePipe(intlTransformers('en-GB'));
  const invalid = pipe.compile('{x|number,style:"invalid"}');
  assert.throws(() => invalid({ x: 1 }), RangeError);
  const render = pipe.compile('{x|number,minimumFractionDigits:{digits}}');
  assert.equal(render({ x: 1, digits: 1 }), '1.0');
  assert.equal(render({ x: 1, digits: 3 }), '1.000');
  assert.equal(pipe.compileRaw('{x|number,minimumFractionDigits:2}')({ x: 1 }), ['', '1.00', '']);
});

test('adjacent placeholders preserve string coercion and raw values', () => {
  const pipe = MessagePipe();
  assert.equal(pipe.compile('{a}{b}')({ a: 1, b: 2 }), '12');
  assert.equal(pipe.compileRaw('{a}{b}')({ a: 1, b: 2 }), ['', 1, '', 2, '']);
});

for (const locale of ['en-GB', 'de-DE', 'ar', 'lv']) {
  test(`prepared formats preserve native Intl behavior in ${locale}`, () => {
    const pipe = MessagePipe(intlTransformers(locale));
    const number = pipe.compile('{x|number,style:"currency",currency:"EUR"}');
    const expectedNumber = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
    const plural = pipe.compile('{x|plural,zero:"zero # #",one:"one # #",two:"two # #",few:"few # #",many:"many # #",other:"other # #"}');
    const rules = new Intl.PluralRules(locale);
    for (const x of [0, -0, 1, 2, 5, 21, 1.5, NaN]) {
      assert.equal(number({ x }), expectedNumber.format(x));
      assert.equal(plural({ x }), rules.select(x) + ' ' + x + ' ' + x);
    }
  });
}

for (const template of ['{x|number,minimumFractionDigits:2}', '{x|number,minimumFractionDigits:{digits}}']) {
  test(`transformer lookup precedes argument evaluation: ${template}`, () => {
    const transformers = intlTransformers('en-GB');
    const original = transformers.number;
    const render = MessagePipe(transformers).compile(template);
    const props = { get x() { transformers.number = () => 'replacement'; return 1; }, digits: 2 };
    assert.equal(render(props), '1.00');
    assert.equal(render({ x: 1, digits: 2 }), 'replacement');
    transformers.number = original;
    assert.equal(render({ x: 1, get digits() { transformers.number = () => 'replacement'; return 2; } }), '1.00');
  });
}

test('dynamic preparation preserves option changes, objects and undefined choices', () => {
  const pipe = MessagePipe({ ...intlTransformers('en-GB'), ...defaultTransformers() });
  const number = pipe.compile('{x|number,minimumFractionDigits:{digits},maximumFractionDigits:{digits}}');
  for (let digits = 0; digits < 20; digits++) {
    assert.equal(number({ x: 1, digits }), digits ? '1.' + '0'.repeat(digits) : '1');
  }
  assert.equal(number({ x: 1, digits: 2 }), '1.00');
  let digits = 3;
  const mutable = { valueOf: () => digits };
  assert.equal(number({ x: 1, digits: mutable }), '1.000');
  digits = 2;
  assert.equal(number({ x: 1, digits: mutable }), '1.00');
  assert.throws(() => number({ x: 1, digits: -1 }), RangeError);
  const select = pipe.compileRaw('{key|select,match:{choice},other:"fallback"}');
  assert.equal(select({ key: 'match', choice: undefined }), ['', undefined, '']);
  assert.equal(select({ key: 'match', choice: null }), ['', null, '']);
  assert.equal(select({ key: 'match', choice: '' }), ['', '', '']);
  assert.equal(select({ key: 'missing', choice: undefined }), ['', 'fallback', '']);
});


test.run();
