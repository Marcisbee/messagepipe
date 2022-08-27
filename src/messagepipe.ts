import { parser } from './parser';

export interface MessagePipeTransformer<Input = string, Output = string> {
  (value: Input, options?: Record<string, any>): Output;
}

export interface MessagePipeTransformers {
  [key: string]: MessagePipeTransformer;
}

export function MessagePipe(transformers: MessagePipeTransformers = {}) {
  function compileRaw<Output = string[]>(message: string): (props?: Record<string, any>) => Output {
    return Function('b', 'return (a)=>[' + parser(message).join(',') + ']')(transformers);
  }

  function compile<Output = string>(message: string): (props?: Record<string, any>) => Output {
    return Function('b', 'return (a)=>' + parser(message).join('+'))(transformers);
  }

  return {
    compileRaw,
    compile,
  };
}
