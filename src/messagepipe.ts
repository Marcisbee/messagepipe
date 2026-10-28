import { parser } from './parser';
import { preparations, type Transform } from './prepared';

export interface MessagePipeTransformer<Input = string, Output = string> {
  (value: Input, options?: Record<string, any>): Output;
}

export interface MessagePipeTransformers {
  [key: string]: MessagePipeTransformer;
}

export interface MessagePipeOptions {
  disableCache?: boolean;
}

export function MessagePipe(transformers: MessagePipeTransformers = {}, { disableCache = false }: MessagePipeOptions = {}) {

  const rcache: Record<string, any> = Object.create(null);
  const scache: Record<string, any> = Object.create(null);

  function build(message: string, raw: boolean) {
    const prepared: Transform[] = [];
    const chunks = parser(message, (name, input, props) => {
      const original = Object.getOwnPropertyDescriptor(transformers, name)?.value;
      const prepare = preparations.get(original);
      // Only scalar literals are safe to move out of the render path. Dynamic
      // selectors, expressions and custom transformers keep their original behavior.
      const literal = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|true|false|null)$/;
      if (!prepare || props.some(([key, value]) =>
        !/^[A-Za-z_$][\w$]*$/.test(key.trim()) || (value !== undefined && !literal.test(value.trim())))) {
        return undefined;
      }
      const source = '{' + props.map(([key, value = 'true']) => key + ':' + value).join(',') + '}';
      const createOptions = Function('return (' + source + ')');
      const options = createOptions();
      // Preparation stays lazy so invalid Intl options still throw on rendering.
      let render: Transform | undefined;
      const index = prepared.push(value => {
        const current = transformers[name];
        if (current !== original) {
          if (props.length) {
            return current.call(transformers, value, createOptions());
          }
          return input.trim() ? current.call(transformers, value) : Reflect.apply(current, transformers, []);
        }
        render ??= prepare(options);
        return render(value);
      }) - 1;
      return 'c[' + index + '](' + input + ')';
    });
    const expression = raw ? '[' + chunks.join(',') + ']'
      : chunks.filter((chunk, index) => index === 0 || chunk !== '""').join('+');
    return Function('b', 'c', 'return (a={})=>' + expression)(transformers, prepared);
  }

  function compileRaw<Output = string[]>(message: string): (props?: Record<string, any>) => Output {
    if (!disableCache && rcache[message]) {
      return rcache[message];
    }
    const render = build(message, true);
    return disableCache ? render : rcache[message] = render;
  }

  function compile<Output = string>(message: string): (props?: Record<string, any>) => Output {
    if (!disableCache && scache[message]) {
      return scache[message];
    }
    const render = build(message, false);
    return disableCache ? render : scache[message] = render;
  }

  return {
    compileRaw,
    compile,
  };
}
