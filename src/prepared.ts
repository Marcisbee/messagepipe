// Internal compiler hooks: only built-ins opt in to constant-option preparation.
export type Transform = (value: any, options?: Record<string, any>) => any;
export const preparations = new WeakMap<Transform, (options: Record<string, any>) => Transform>();

// Cache only immutable scalar inputs. Objects may have mutable coercion behavior,
// and undefined can mean the current time. Keep signed zero distinct by bypassing it.
export function memoizeFormat(format: Transform): Transform {
  const cache = new Map<any, any>();
  let misses = 0;
  return value => {
    if (misses >= 100) {
      return format(value);
    }
    const type = typeof value;
    if ((type !== 'string' && type !== 'number' && type !== 'bigint') || Object.is(value, -0)) {
      return format(value);
    }
    const cached = cache.get(value);
    if (cached !== undefined) {
      misses = 0;
      return cached;
    }
    const output = format(value);
    if (++misses >= 100) {
      cache.clear();
      return output;
    }
    if (cache.size >= 100) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(value, output);
    return output;
  };
}
