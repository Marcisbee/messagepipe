import { MessagePipe } from './src'

const mp1 = MessagePipe({
  reverse(value) {
    return value.split('').reverse().join('')
  },
  capitalize(value) {
    return value[0].toUpperCase() + value.slice(1).toLowerCase()
  },
})

console.log(mp1.compile('Hello {planet | reverse | capitalize}!')({ planet: 'Mars' }))

const mp2 = MessagePipe({
  remove(value, { text, replacer = '' }) {
    if (!text) {
      return '';
    }

    return value.replace(text, replacer);
  },
})

console.log(mp2.compile('Hello {planet | remove, "text":"a", replacer: "4"}!')({ planet: 'Mars' }))
