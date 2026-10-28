# <picture><source media="(prefers-color-scheme: dark)" srcset="./assets/logo-light.svg"><img alt="Messagepipe" src="./assets/logo-dark.svg"></picture>

<a href="https://www.npmjs.com/package/messagepipe">
  <img alt="npm" src="https://img.shields.io/npm/v/messagepipe.svg?style=flat-square" />
</a>
<a href="https://bundlephobia.com/result?p=messagepipe">
  <img alt="package size" src="https://img.shields.io/bundlephobia/minzip/messagepipe?style=flat-square" />
</a>

<br />

Formats message strings with number, date, plural, and select placeholders to create localized messages.

* **Small.** Zero runtime dependencies.
* **Fast.** Precompiles messages and reuses formatters. View [benchmarks](#benchmarks).
* **Tree Shakable.** Includes separate global transformers config that can be omitted.
* **Pipe syntax.** Transformer functions can customized and chained.
* **View framework support.** Use React/Preact etc. components as transformers.
* It has good **TypeScript** support.

```ts
import { MessagePipe } from 'messagepipe'

const msg = MessagePipe().compile('Hello {planet}!')

msg({ planet: 'Mars' }) // => "Hello Mars!"
```
[live demo](https://dune.land/dune/5698fd12-e76e-4284-9113-012d11c8a193)

```ts
import { MessagePipe } from 'messagepipe'

const { compile } = MessagePipe({
  reverse: (val) => val.split('').reverse().join(''),
  capitalize: (val) => val[0].toUpperCase() + val.slice(1).toLowerCase(),
})

const msg = compile('Hello {planet | reverse | capitalize}!')

msg({ planet: 'Mars' }) // => "Hello Sram!"
```
[live demo](https://dune.land/dune/9a5917fa-3763-4213-8fbf-0938d7e7c647)

## Install

```sh
npm install messagepipe
```

## Guide

### Core concepts

```
          ┌-transformer
          |     ┌-argument name
          |     |     ┌-argument value
          ├--┐  ├---┐ ├-┐

  {name | json, space:101}

  ├----------------------┘
  |├--┘   ├-------------┘
  ||      |     ├-------┘
  ||      |     └-argument
  ||      └-pipe
  |└-selector
  └-message
```

In one [message](#message) there can only be one [selector](#selector), but there can be unlimited number of [pipes](#pipe) with unlimited number of [arguments](#argument) in them. It is possible to build dynamic [selector](#selector) (meaning [message](#message) can be inside it), but it is not possible to build dynamic [pipes](#pipe) except for [argument values](#argument).

So both of these are valid:
1. `"Hello {agents.{index}.fistName}"`;
2. `"{a} + {b} = {a | sum, sequence:{b}}"`.
_(Note: sum is a custom transformer in this case)_.

### Message
Contains everything between `{` and `}` that in large includes 1 [selector](#selector) and n [pipes](#pipe).

### Selector
String value that points to value from given props object e.g.:
- `"{name}"` + `{ name: 'john' }` => `"john"`;
- `"{agents[0].name}"` + `{ agents: [{ name: 'john' }] }` => `"john"`

### Pipe
A combination of 1 `transformer` and n `arguments` e.g.:
- `"{name | capitalize}"`;
- `"{name | reverse | capitalize}"`;
- `"{a | sum, sequence:1, double}"` _(Note: argument "double" will pass `true` value to "sum" transformer)_.

### Transformer
Function that can transform value that is being selected from given props.

Lets define "capitalize" transformer that would uppercase the first letter of any string:
```ts
function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}
```

To use this transformer define it when initiating MessagePipe and then it will be available to pipes with name "capitalize":

```ts
const msgPipe = MessagePipe({
  capitalize,
})
```

This would be valid use case for it: `"Greetings {name | capitalize}!"`.

### Argument

Single- and double-quoted argument values may contain delimiters such as commas,
colons, pipes, and braces. JavaScript string escapes are preserved inside quotes.
Outside placeholders, a backslash escapes the following character; use two
backslashes for a literal backslash.

To allow more functionality, we can use arguments, that are passed to transformer function.

```ts
function increment(value: number, { by = 1 }: Record<string, any> = {}) {
  return value + by;
}
```

We can now use it like this:
- `"{count | increment}"` + `{ count: 1 }` => `2`;
- `"{count | increment, by:1}"` + `{ count: 1 }` => `2`;
- `"{count | increment, by:5}"` + `{ count: 1 }` => `6`.

We can stack any number of arguments separated by `,` (comma).

### Global transformers
There are number of already provided transformers, but they MUST be added to MessagePipe function when initiating. This is by design to help with tree shaking (although they don't contribute that much to package size, if there are additions in future, that won't hurt anyone).

### `defaultTransformers`
```ts
function defaultTransformers(): MessagePipeTransformers
```

#### select
Selects what text to show based on incoming value.

```ts
const msg = compile('{gender | select, male:"He", female:"She", other:"They"} liked this.')

msg({ gender: 'male' }) // "He liked this"
msg({ gender: 'female' }) // "She liked this"
msg({ }) // "They liked this"
```

#### json
Runs value through `JSON.stringify`.

### `intlTransformers`
```ts
function intlTransformers(locale?: string): MessagePipeTransformers
```

#### number
Formats numbers using [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat). All options are available as arguments in pipes.

```ts
const msg = compile('{price | number}')

msg({ price: 123456.789 }) // "123,456.789"
```

```ts
const msg = compile('Price: {price | number, style:"currency", currency:"EUR"}')

msg({ price: 123 }) // "Price: 123,00 €"
```

#### plural
Selects correct text to show based on [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules). All options are available as arguments in pipes.

```ts
const msg = compile('I have {fruits | plural, one:"1 fruit", other:"# fruits"}')

msg({ fruits: 0 }) // "I have 0 fruits"
msg({ fruits: 1 }) // "I have 1 fruit"
msg({ fruits: 2 }) // "I have 2 fruits"
```

#### date
Formats date using [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat). All options are available as arguments in pipes.

```ts
const msg = compile('Todays date {now | date}')

msg({ now: new Date('1977-05-25') }) // "Todays date 25/05/1977"
```

#### time
Formats time using [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat). All options are available as arguments in pipes.

```ts
const msg = compile('Currently it is {now | time}')

msg({ now: new Date('1983-05-25 16:42') }) // "Currently it is 16:42:00"
```

#### relativeTime

Formats a duration in **milliseconds**, using hours by default. Set `type` to an
Intl relative-time unit (singular or plural); other options, such as `numeric`,
are forwarded to `Intl.RelativeTimeFormat`.

```ts
const msg = compile('{duration | relativeTime, type:"day", numeric:"auto"}')
msg({ duration: 86400000 }) // "tomorrow" (English locale)
```

Months, quarters, and years use fixed durations of 30, 90, and 365 days. For
calendar-aware differences, compute the duration in your application first.

Intl formatters are reused per `intlTransformers(locale)` instance, with at most
100 option combinations retained per formatter kind. Dynamic option values
continue to work. Date and time component defaults are omitted when `dateStyle`
or `timeStyle` is supplied. Plural selection falls back to `other` and replaces
every `#` in the selected text; an explicitly empty selection stays empty.

## API

### `MessagePipe`
This is the main function that takes in all the transformers that will be available to all the messages.

```ts
function MessagePipe(transformers?: MessagePipeTransformers, options?: { disableCache?: boolean }): {
  compileRaw(message: string): (props?: Record<string, any>) => string[]
  compile(message: string): (props?: Record<string, any>) => string
}
```

Example usage:

```ts
const messagePipe = MessagePipe({
  hello: (value) => `Hello ${value}!`,
})
```

Built-in number, date, time, plural, and select pipes with scalar literal options
prepare their options on first render. Number/date/time/plural pipes retain at
most 100 formatted scalar values per compiled pipe. After 100 consecutive cache
misses, that result cache is cleared and bypassed for the lifetime of the pipe.
Mutable objects, omitted values, and negative zero bypass result caching.
Dynamic options and custom transformers retain their normal per-call behavior.
Replacing a transformer is still observed by already-compiled messages.

Compiled messages are cached within each MessagePipe instance, so transformer
sets and locales stay independent. Set `disableCache: true` to bypass message
caching. Omitted props are treated as an empty object.

Message templates are trusted application code: compilation uses `Function`
and evaluates JavaScript selector and argument expressions. Do not compile
untrusted templates. This also requires a CSP that allows dynamic compilation.

Now all the messages that get compiled from `messagePipe` can use this transformer like so `"{name | hello}"`.

#### `compile`
This is where given [message](#message) gets parsed and prepared for usage. It is very efficient compiler that does only 1 pass and prepares very tiny and performant function from it.

Given this message `"Hello {name | capitalize}!"`, compiler will output this function `(a) => "Hello " + capitalize(a.name) + "!"` for the custom transformer call.

#### `compileRaw`
This is practically the same as [compile](#compile) but instead of it returning one string, it returns array of all of the things as a separate chunks so that this compiler can be used as part of React component for example.

So from the example that was before, the output of that message would be `(a) => ["Hello ", capitalize(a.name), "!"]`.

## Benchmarks

### MessagePipe vs. MessageFormat

Measured on 2026-10-28 against **`@messageformat/core@3.4.1`**, the
[ICU MessageFormat compiler](https://messageformat.github.io/messageformat/api/core.messageformat/).
This is the MessageFormat v3 API, rather than the newer MessageFormat 2 syntax
implemented by the `messageformat` v4 package. The comparison dependency is
pinned for reproducibility and is development-only.

| Workload | MessageFormat (ops/s) | MessagePipe (ops/s) | MessagePipe / MessageFormat |
| --- | ---: | ---: | ---: |
| Plain text: `Wow` | 255,376,701 | 270,826,783 | 1.06× |
| Interpolation: `Hello {planet}` | 129,480,176 | 129,084,392 | 1.00× |
| Select: gender pronoun | 73,510,434 | 107,647,250 | 1.46× |
| Number: EUR currency | 4,729,385 | 74,172,405 | 15.68× |
| Date: day/month/year | 2,363,663 | 72,330,073 | 30.60× |
| Plural: item count | 4,274,800 | 64,555,366 | 15.10× |

Higher throughput is better. Select and the Intl workloads are faster in these
measurements; interpolation is effectively tied. The small plain-text difference
is sensitive to loop overhead and does not establish a universal speed advantage.

The number, date, and plural rows above rotate three values and benefit from
bounded formatted-value reuse. To expose cache-miss costs, a second run rotates
**1,000 distinct inputs** for each Intl workload:

| Workload | MessageFormat (ops/s) | MessagePipe (ops/s) | MessagePipe / MessageFormat |
| --- | ---: | ---: | ---: |
| Number | 4,617,836 | 6,171,794 | 1.34× |
| Date | 2,342,674 | 2,648,567 | 1.13× |
| Plural | 3,332,201 | 3,767,459 | 1.13× |

Both libraries compile once before timing and receive equivalent templates,
locales, and inputs. Every input must produce the same expected string in both
libraries before measurement; timed calls contribute to a checked output
checksum. Compiler initialization and compilation are excluded.

Tables use the median of **21 samples** per library and workload, collected in
three independent processes with seven samples each. Each sample performs
1,000,000 calls after 10,000 warmup calls. Measurement order alternates between
libraries. The runner prints templates, inputs, samples, and runtime metadata.
Host: Linux x64 (WSL), AMD Ryzen 9 9950X, Node 22.23.2, ICU 78.2, `en-GB`, UTC.
MessagePipe uses its minified CommonJS build; MessageFormat uses the functions
returned by its installed compiler.

```sh
npm ci
npm run build
npm run benchmark
npm run benchmark -- --varied
```

Run each benchmark command three times to reproduce the table's sampling method.
An optional CommonJS bundle path compares another MessagePipe build:

```sh
npm run benchmark -- /path/to/messagepipe/dist/index.js
```

These are warm formatting microbenchmarks. Literal options are prepared once,
and repeated immutable values may reuse a formatted result. The varied-input
mode exceeds the result cache capacity and exercises its automatic bypass.
Compilation, dynamic options, mutable objects, other runtimes, and other messages
can give different results. The shared input-rotation/checksum loop matters most
for the fastest cases. These results do not prove superiority on every workload.

## Framework integration
Works with React and Preact out of the box. Just swap out [`compile`](#compile) with [`compileRaw`](#compile) and good to go. This works because it returns raw array of values that was the output of selectors and transformers.

```tsx
import { MessagePipe } from 'messagepipe'

function Mention(username) {
  const {href} = useUser(username)

  return <a href={href}>{username}</a>
}

// We use React/Preact component as a transformer
const { compileRaw } = MessagePipe({ Mention })
const msg = compileRaw('Hello {name | Mention}!')

function App() {
  return <div>{msg({name: 'john'})}</div>
} // => "<div>Hello <a href="...">john</a>!</div>"
```
Live demo on [dune.land](https://dune.land/dune/9024bae9-c77e-4a72-bcd9-8e2ce7c6f673).

Since we used [compileRaw](#compileraw), library would output something like this: `['Hello ', [ReactElement], '!']`.

This will work with any kind of framework or custom library.

# Motivation
I was used to messageformat being the go to for this sort of stuff, but it has big flaws in the spec and library maintainers obviously wouldn't want to deviate from it. So the goal for messagepipe was to create NEW spec that solves all of the issues with it + must be faster & smaller.

One immediate flaw that MessagePipe solves is ability to select nested values and build dynamic messages.

# License
[MIT](LICENCE) &copy; [Marcis Bergmanis](https://twitter.com/marcisbee)
