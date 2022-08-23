function getValue(record: Record<string, any>, path: string[]): any {
  if (path.length === 0) {
    return record;
  }

  const [key, ...restPath] = path;

  if (key === '*') {
    return record.map((object: any) => getValue(object, restPath));
  }

  const value = record[key];

  if (restPath.length === 0) {
    return value;
  }

  return getValue(value, restPath);
}

export function formatRaw(
  message: string,
  params: Record<string, any> = {},
  transformers: Record<string, Function> = {},
) {
  const chunks = message.split(/{|}/);
  const isOdd = chunks.length % 2;

  if (!isOdd) {
    throw new Error(`Invalid message "${message}"`);
  }

  const result: string[] = [];

  for (const index in chunks) {
    const isVariable = Number(index) % 2;
    const chunk = chunks[index];

    if (!isVariable) {
      result.push(chunk);
      continue;
    }

    const [variable, ...pipes] = chunk.trim().split(/\s*\|\s*/);

    const value = pipes
      .reduce((value, pipe) => {
        const [fn, ...args] = pipe.split(/\s*,\s*/);
        const transformer = transformers[fn];
        const options: Record<string, string> = {};

        if (typeof transformer !== 'function') {
          throw new Error(`Transformer "${fn}" not found for "${message}"`);
        }

        for (const option of args) {
          const [optionPath, optionValue] = option.trim().split(/\s*:\s*/);
          try {
            options[optionPath] = JSON.parse(optionValue);
          } catch (e) {
            throw new Error(`Invalid property value ${optionPath}:${optionValue}`);
          }
        }

        return transformer(value, options);
      }, getValue(params, variable.split('.')));

    result.push(value);
  }

  return result;
}

export function format(
  message: string,
  params?: Record<string, any>,
  transformers?: Record<string, Function>,
) {
  return formatRaw(message, params, transformers).join('');
}
