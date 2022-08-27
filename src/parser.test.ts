import { test } from 'uvu'
import assert from 'uvu/assert'

import { parser } from './parser'

test('exports `parser`', () => {
  assert.instance(parser, Function)
})

test('returns simple string', () => {
  assert.equal(parser('Hello world!'), ['"Hello world!"'])
})

test('returns string with message', () => {
  assert.equal(parser('Hello {name}!'), ['"Hello "', 'a.name', '"!"'])
})

test('returns empty selector + pipe', () => {
  assert.equal(parser('{|random}'), ['""', 'b.random()', '""'])
})

test('returns empty selector + pipe 2', () => {
  assert.equal(parser('{ | random, min: 5, max:10}'), ['""', 'b. random(void 0,{ min: 5, max:10})', '""'])
})

test('returns string with message and pipe', () => {
  assert.equal(parser('Hello {name | capitalize}!'), ['"Hello "', 'b. capitalize(a.name)', '"!"'])
})

test('returns string with message, pipe and arguments', () => {
  assert.equal(parser('Hello {name | capitalize, letter:"b"}!'), ['"Hello "', 'b. capitalize(a.name,{ letter:"b"})', '"!"'])
})

test('returns string with message, pipe and arguments (true)', () => {
  assert.equal(parser('Hello {name | capitalize, letter}!'), ['"Hello "', 'b. capitalize(a.name,{ letter:true})', '"!"'])
})

test('returns nested message selector', () => {
  assert.equal(parser('Hello {agents.{index}.name | capitalize}!'), ['"Hello "', 'b. capitalize(a.agents[a.index].name)', '"!"'])
})

test('returns nested message selector ONLY', () => {
  assert.equal(parser('Hello {{index} | capitalize}!'), ['"Hello "', 'b. capitalize(a[a.index])', '"!"'])
})

test('returns escaped selector', () => {
  assert.equal(parser('Hello \\{agents.{index}.name | capitalize\\}!'), ['"Hello {agents."', 'a.index', '".name | capitalize}!"'])
})

test.run()
