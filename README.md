# ![messagepipe](./assets/logo-light.svg#gh-dark-mode-only)![messagepipe](./assets/logo-dark.svg#gh-light-mode-only)

Formats message strings with number, date, plural, and select placeholders to create localized messages.

* **Small.** Between 464 bytes and 1 kilobytes (minified and gzipped).
  Zero dependencies.
* **Fast.** Does absolute minimum amount of computations necessary.
* **Tree Shakable.** Includes separate global transformers config that can be omitted.
* **Pipe syntax.** Transformer functions can customized and chained.
* It has good **TypeScript** support.

```ts
import { format } from 'messagepipe'

format('Hello {planet}!', { planet: 'Mars' })
```

```ts
import { format } from 'messagepipe'

const transformers = {
  reverse(value) {
    return value.split('').reverse().join('')
  },
  capitalize(value) {
    return value[0].toUpperCase() + value.slice(1).toLowerCase()
  },
}

format('Hello {planet | reverse | capitalize}!', { planet: 'Mars' }, transformers)
```

## Install

```sh
npm install messagepipe
```

## Guide

### @TODO: Core concepts

### @TODO: Transformers

### Global transformers

#### `number`
@TODO: Write about this

#### `plural`
@TODO: Write about this

#### `date`
@TODO: Write about this

#### `time`
@TODO: Write about this

#### `relativeTime`
@TODO: Write about this

#### `select`
@TODO: Write about this

#### `json`
@TODO: Write about this

## API

### @TODO: `format`

### @TODO: `formatRaw`

### @TODO: `getGlobalTransformers`

## Framework integration

Works with React and Preact out of the box. Just swap out `format` with `formatRaw` and good to go. This works because it returns raw array of values that was the output of selectors and transformers.

```tsx
import { formatRaw } from 'messagepipe'

function Mention(username) {
  const {href} = useUser(username)

  return <a href={href}>{username}</a>
}

const transformers = { Mention }

function App() {
  const message = 'Hello {name | Mention}'
  return <div>{formatRaw(message, {name: 'john'}, transformers)}</div>
} // => "<div>Hello <a href="...">john</a></div>"
```

# Motivation
I was used to messageformat being the go to for this sort of stuff, but it has big flaws in the spec and library maintainers obviously wouldn't want to deviate from it. So the goal for messagepipe was to create NEW spec that solves all of the issues with it + must be faster & smaller.

One immediate flat that messagepipe solves is ability to select nested properties.

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
  - [x] Passing variables to transformer
    - `{name | json, space:2}` => `json("John", {space:2})`
  - [x] Passing variables to transformer
    - `{name | remove, text:"name", caseSensitive:true}` => `remove("John", {text:"name", caseSensitive:true})`
  - [ ] Escape `{` & `}`
    - `Escaped: \\{ \\}` => `"Escaped: { }"`
  - [ ] Using selector inside selector
    - `{agent.{index}.name}` => `"Lars"`


# License
[MIT](LICENCE) &copy; [Marcis Bergmanis](https://twitter.com/marcisbee)
