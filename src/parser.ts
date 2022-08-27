const tokenStart = '{';
const tokenEnd = '}';
const tokenPipe = '|';
const tokenPipeArguments = ',';
const tokenPipeArgumentsValue = ':';

// "Hello {name} from the {planet | capitalize} {distance | number, unit:"lightyears"}"
// (a) => "Hello " + a.name + " from the " + capitalize(a.planet) + " " + number(a.distance, {unit:'lightyears'})

function fail(char: string, index: number): never {
  throw new Error('Unexpected char `' + char + '` at ' + index);
}

function mapPipeProps([name, value = true]: [string, any]): string {
  return '' + name + ':' + value;
}

function reducePipe(acc: string, [pipeName, ...pipeProps]: [string, ...[string, string][]]): string {
  return 'b.'
    + pipeName
    + '('
    + acc
    + (!pipeProps.length
        ? ''
        : ',{' + pipeProps.map(mapPipeProps).join() + '}')
    + ')';
}

export function parser(text: string): string[] {
  const output: string[] = [];
  let chunk = '';

  // This is where message starts.
  // "Hello {name}!"
  //         ^
  // It must return end index of the message and parsed data.
  function messageStart(startIndex: number): { index: number, output: string; } {
    let localSelector = '';
    let localPipes: [string, ...[string, string][]][] = [];
    let localPipeIndex = -1;

    function end(index: number) {
      const selector = localSelector ? 'a.' + localSelector : '';
      const output = localPipes.reduce(reducePipe, selector);

      return {
        index,
        output,
      };
    }

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (tokenPipe === char) {
        localPipeIndex += 1;
        localPipes[localPipeIndex] = [''];
        continue;
      }

      // Handle message inside selector
      if (tokenStart === char && localPipeIndex === -1) {
        const messageData = messageStart(i + 1);
        i = messageData.index;
        if (localSelector[localSelector.length - 1] === '.') {
          localSelector = localSelector.slice(0, -1);
        }
        localSelector += '[' + messageData.output + ']';
        continue;
      }

      if (tokenEnd === char) {
        return end(i);
      }

      if (localPipeIndex > -1) {
        const pipe = localPipes[localPipeIndex];
        const args = pipe[pipe.length - 1];

        if (tokenPipeArguments === char) {
          pipe.push([''] as any);
          continue;
        }

        if (Array.isArray(args)) {
          if (tokenPipeArgumentsValue === char) {
            args.push('');
            continue;
          }

          // Handle message inside arguments
          if (tokenStart === char) {
            const messageData = messageStart(i + 1);
            i = messageData.index;
            args[args.length - 1] += messageData.output;
            continue;
          }

          args[args.length - 1] += char;
          continue;
        }

        // Message starts is outside allowed zones
        if (tokenStart === char) {
          fail(char, i);
        }

        pipe[pipe.length - 1] += char;
        continue;
      }

      // Message starts is outside allowed zones
      if (tokenStart === char) {
        fail(char, i);
      }

      localSelector += char;
    }

    fail(tokenStart, startIndex);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (tokenStart === char) {
      output.push(JSON.stringify(chunk));
      chunk = '';
      const messageData = messageStart(i + 1);
      i = messageData.index;
      output.push(messageData.output);
      continue;
    }

    chunk += char;
  }

  return output.concat(JSON.stringify(chunk));
}
