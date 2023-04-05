# ![messagepipe](./assets/logo-light.svg#gh-dark-mode-only)![messagepipe](./assets/logo-dark.svg#gh-light-mode-only)

<a href="https://snyk.io/test/github/Marcisbee/messagepipe">
  <img alt="snyk" src="https://img.shields.io/snyk/vulnerabilities/github/Marcisbee/messagepipe?style=flat-square" />
</a>
<a href="https://www.npmjs.com/package/messagepipe">
  <img alt="npm" src="https://img.shields.io/npm/v/messagepipe.svg?style=flat-square" />
</a>
<a href="https://bundlephobia.com/result?p=messagepipe">
  <img alt="package size" src="https://img.shields.io/bundlephobia/minzip/messagepipe?style=flat-square" />
</a>
<a href="https://discord.gg/a62gfaDW2e">
  <img alt="discord" src="https://dcbadge.vercel.app/api/server/a62gfaDW2e?style=flat-square" />
</a>

<br />

Formats message strings with number, date, plural, and select placeholders to create localized messages.

* **Small.** Between 700 bytes and 1.3 kilobytes (minified and gzipped).
  Zero dependencies.
* **Fast.** Does absolute minimum amount of computations necessary. View [benchmarks](#benchmarks).
* **Tree Shakable.** Includes separate global transformers config that can be omitted.
* **Pipe syntax.** Transformer functions can customized and chained.
* **View framework support.** Use React/Preact etc. components as transformers.
* It has good **TypeScript** support.

```ts
import { MessagePipe } from 'messagepipe'

const msg = MessagePipe().compile('Hello {planet}!')

msg({ planet: 'Mars' }) // => "Hello Mars!"
```
[live demo](https://runkit.com/marcisbee/messagepipe-demo-1)

```ts
import { MessagePipe } from 'messagepipe'

const { compile } = MessagePipe({
  reverse: (val) => val.split('').reverse().join(''),
  capitalize: (val) => val[0].toUpperCase() + val.slice(1).toLowerCase(),
})

const msg = compile('Hello {planet | reverse | capitalize}!')

msg({ planet: 'Mars' }) // => "Hello Sram!"
```
[live demo](https://runkit.com/marcisbee/messagepipe-demo-2)

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
To allow more functionality, we can use arguments, that are passed to transformer function.

```ts
function increment(value: number, { by = 1 }: Record<string, any> = {}) {
  return value + by;
}
```

We can now use it like this:
- `"{count | increment}"` + `{ count: 1 }` => `2`;
- `"{count | increment | by:1}"` + `{ count: 1 }` => `2`;
- `"{count | increment | by:5}"` + `{ count: 1 }` => `6`.

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

## API

### `MessagePipe`
This is the main function that takes in all the transformers that will be available to all the messages.

```ts
function MessagePipe(transformers?: MessagePipeTransformers): {
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

Now all the messages that get compiled from `messagePipe` can use this transformer like so `"{name | hello}"`.

#### `compile`
This is where given [message](#message) gets parsed and prepared for usage. It is very efficient compiler that does only 1 pass and prepares very tiny and performant function from it.

Given this message `"Hello {name | capitalize}!"`, compiler will output this function `(a) => "Hello " + capitalize(a.name) + "!"` and that is the only thing that runs when executing it. No hidden performance penalties.

#### `compileRaw`
This is practically the same as [compile](#compile) but instead of it returning one string, it returns array of all of the things as a separate chunks so that this compiler can be used as part of React component for example.

So from the example that was before, the output of that message would be `(a) => ["Hello ", capitalize(a.name), "!"]`.

## Benchmarks
It is necessary for me that this library is as small and as fast as possible. Since this library compares directly with MessageFormat, I treated both as equal in benchmarks.

Message | MessageFormat | MessagePipe | Improvement
|-|-|-|-|
["Wow"](https://fastbench.dev/Format-%22Wow%22-JtYOF/0) | 926,368 ops/s | __1,847,253 ops/s__ | 2x
["Hello {planet}"](https://fastbench.dev/Format-%22Hello-planet%22-tKWLnH/0) | 560,131 ops/s | __1,024,051 ops/s__ | 1.8x
[select transformer](https://fastbench.dev/Format-select-MovWE/0) | 209,513 ops/s | __337,226 ops/s__ | 1.6x

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
Live demo on [Stackblitz](https://stackblitz.com/edit/vitejs-vite-2cz8zx?file=src%2FApp.tsx&terminal=dev).

Since we used [compileRaw](#compileraw), library would output something like this: `['Hello ', [ReactElement], '!']`.

This will work with any kind of framework or custom library.

# Motivation
I was used to messageformat being the go to for this sort of stuff, but it has big flaws in the spec and library maintainers obviously wouldn't want to deviate from it. So the goal for messagepipe was to create NEW spec that solves all of the issues with it + must be faster & smaller.

One immediate flaw that MessagePipe solves is ability to select nested values and build dynamic messages.

# License
[MIT](LICENCE) &copy; [Marcis Bergmanis](https://twitter.com/marcisbee)
