import { parser } from './parser';

export interface MessagePipeTransformer<Input = string, Output = string> {
  (value: Input, options?: Record<string, any>): Output;
}

export interface MessagePipeTransformers {
  [key: string]: MessagePipeTransformer;
}

export interface MessagePipeOptions {
  disableCache?: boolean;
}

const rcache: Record<string, any> = {};
const scache: Record<string, any> = {};

export function MessagePipe(transformers: MessagePipeTransformers = {}, { disableCache = false }: MessagePipeOptions = {}) {

  function compileRaw<Output = string[]>(message: string): (props?: Record<string, any>) => Output {
    if (!disableCache && rcache[message]) {
      return rcache[message];
    }

    const parsedMessage = Function('b', 'return (a)=>[' + parser(message).join(',') + ']');

    return disableCache ? parsedMessage(transformers) : rcache[message] = parsedMessage(transformers);
  }

  function compile<Output = string>(message: string): (props?: Record<string, any>) => Output {
    if (!disableCache && scache[message]) {
      return scache[message];
    }

    const parsedMessage = Function('b', 'return (a)=>' + parser(message).join('+'));

    return disableCache ? parsedMessage(transformers) : scache[message] = parsedMessage(transformers);
  }

  return {
    compileRaw,
    compile,
  };
}
