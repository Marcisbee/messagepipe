import { parser } from './parser';

export function MessagePipe(transformers: Record<string, any> = {}) {
  function compileRaw(message: string) {
    return Function('b', 'return (a)=>[' + parser(message).join(',') + ']')(transformers);
  }

  function compile(message: string) {
    return Function('b', 'return (a)=>' + parser(message).join('+'))(transformers);
  }

  return {
    compileRaw,
    compile,
  };
}
