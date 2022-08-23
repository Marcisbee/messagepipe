import { format } from './src'

const transformers = {
  reverse(value) {
    return value.split('').reverse().join('')
  },
  capitalize(value) {
    return value[0].toUpperCase() + value.slice(1).toLowerCase()
  },
}

console.log(format('Hello {planet | reverse | capitalize}!', { planet: 'Mars' }, transformers))

const transformers2 = {
  remove(value, { text, replacer = '' }) {
    if (!text) {
      return '';
    }

    return value.replace(text, replacer);
  },
}

console.log(format('Hello {planet | remove, text:"a", replacer: "4"}!', { planet: 'Mars' }, transformers2))
