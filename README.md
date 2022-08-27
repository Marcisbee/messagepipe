# ![messagepipe](./assets/logo-light.svg#gh-dark-mode-only)![messagepipe](./assets/logo-dark.svg#gh-light-mode-only)

Formats message strings with number, date, plural, and select placeholders to create localized messages.

* **Small.** Between 0.6 kilobytes and 1 kilobytes (minified and gzipped).
  Zero dependencies.
* **Fast.** Does absolute minimum amount of computations necessary.
* **Tree Shakable.** Includes separate global transformers config that can be omitted.
* **Pipe syntax.** Transformer functions can customized and chained.
* **View framework support.** Use React/Preact etc. components as transformers.
* It has good **TypeScript** support.

```ts
import { MessagePipe } from 'messagepipe'

const msg = MessagePipe().compile('Hello {planet}!')

msg({ planet: 'Mars' }) // => "Hello Mars!"
```

```ts
import { MessagePipe } from 'messagepipe'

const { compile } = MessagePipe({
  reverse: (val) => val.split('').reverse().join(''),
  capitalize: (val) => val[0].toUpperCase() + val.slice(1).toLowerCase(),
})

const msg = compile('Hello {planet | reverse | capitalize}!')

msg({ planet: 'Mars' }) // => "Hello Sram!"
```

## Install

```sh
npm install messagepipe
```

## Guide

### Core concepts

```js
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

In one `message` there can only be one `selector`, but there can be unlimited number of `pipes` with unlimited number of `arguments` in them. It is possible to build dynamic `selector` (meaning `message` can be inside it), but it is not possible to build dynamic `pipes` except for `argument values`.

So both of these are valid:
1. `"Hello {agents.{index}.fistName}"`;
2. `"{a} + {b} = {a | sum, sequence:{b}}"`.
_(Note: sum is a custom transformer in this case)_.

### `message`
Contains everything between `{` and `}` that in large includes 1 `selector` and n `pipes`.

### `selector`
String value that points to value from given props object e.g.:
- `"{name}"` + `{ name: 'john' }` => `"john"`;
- `"{agents[0].name}"` + `{ agents: [{ name: 'john' }] }` => `"john"`

### `pipe`
A combination of 1 `transformer` and n `arguments` e.g.:
- `"{name | capitalize}"`;
- `"{name | reverse | capitalize}"`;
- `"{a | sum, sequence:1, double}"` _(Note: argument "double" will pass `true` value to "sum" transformer)_.

### `transformer`
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

### `argument`
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

### `defaultTransformers`

- #### select
@TODO: Write about this

- #### json
@TODO: Write about this

### `intlTransformers`

- #### number
@TODO: Write about this

- #### plural
@TODO: Write about this

- #### date
@TODO: Write about this

- #### time
@TODO: Write about this

- #### relativeTime
@TODO: Write about this

## API

### @TODO: `MessagePipe`
#### @TODO: `compile`

#### @TODO: `compileRaw`

## Framework integration

Works with React and Preact out of the box. Just swap out `compile` with `compileRaw` and good to go. This works because it returns raw array of values that was the output of selectors and transformers.

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

Since we used `compileRaw`, library would output something like this: `['Hello ', [ReactElement], '!']`.

This will work with any kind of framework or custom library.

# Motivation
I was used to messageformat being the go to for this sort of stuff, but it has big flaws in the spec and library maintainers obviously wouldn't want to deviate from it. So the goal for messagepipe was to create NEW spec that solves all of the issues with it + must be faster & smaller.

One immediate flaw that messagepipe solves is ability to select nested values.

## @TODO:

- [ ] Write up spec
- [x] General idea
  - `Hello {name}!` => `"Hello John!"`
- [x] Selecting shallow values
  - `{name}` => `"John"`
- [x] Selecting nested values
  - `{agent.name}` => `"John"`
- [x] Selecting single value from array
  - `{agent.0.name}` => `"John"`
- [x] Selecting multiple values from array
  - `{agent.*.name}` => `["John", "Lars"]`
- [x] Using transformers
  - `{name | uppercase}` => `uppercase("John")`
- [x] Using chained transformers
  - `{name | reverse | uppercase}` => `uppercase(reverse("John"))`
- [x] Passing parameters to transformer
  - `{name | json, space:2}` => `json("John", {space:2})`
  - `{name | remove, text:"name", caseSensitive:true}` => `remove("John", {text:"name", caseSensitive:true})`
- [ ] Escaping `"`, "|", `,` and `:` in argument names
  - `{name | select, "a\"2":2}`
  - `{name | select, "a:2":2}`
  - `{name | select, "a|2":2}`
  - `{name | select, "a,2":2}`
- [ ] Escape `{` & `}`
  - `Escaped: \\{ \\}` => `"Escaped: { }"`
- [x] Using selector inside selector
  - Nested selector in selector can only be used to define path of the selector
  - `{agent.{index}.name}` = `{agent[2].name}` => `"Lars"`
  - `{agent.{index}}` = `{agent[2]}` => `{"name":"Lars"}`
  - `{{index}}` = `{2}` => `undefined`
- [x] Using selector inside pipes
  - Nested selector in pipes can only be used to construct argument values
  - `{name | json, space:{space}}` => `json("John", {space:2})`

# License
[MIT](LICENCE) &copy; [Marcis Bergmanis](https://twitter.com/marcisbee)
