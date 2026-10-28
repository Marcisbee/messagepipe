// Bound retention when dynamic messages produce many distinct Intl options.
function formatterCache<T>(create: (options: Record<string, any>) => T) {
  const cache = new Map<string, T>();
  return (options: Record<string, any>): T => {
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) {
      return create(options);
    }
    const descriptors = Object.entries(Object.getOwnPropertyDescriptors(options));
    // Let Intl read accessors itself, exactly once and in its specified order.
    if (descriptors.some(([, descriptor]) => !('value' in descriptor))) {
      return create(options);
    }
    const entries = descriptors
      .map(([key, descriptor]) => [key, descriptor.value] as [string, any])
      .filter(([, value]) => value !== undefined);
    // Preserve Intl coercion semantics for non-primitive values and non-finite numbers.
    if (entries.some(([, value]) => !['string', 'number', 'boolean'].includes(typeof value)
      || (typeof value === 'number' && !Number.isFinite(value)))) {
      return create(options);
    }
    const key = JSON.stringify(entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    let formatter = cache.get(key);
    if (!formatter) {
      formatter = create(options);
      if (cache.size >= 100) {
        cache.delete(cache.keys().next().value!);
      }
      cache.set(key, formatter);
    }
    return formatter;
  };
}

export function intlTransformers(locale: string = 'en-GB') {
  const number = formatterCache(options => new Intl.NumberFormat(locale, options));
  const date = formatterCache(options => new Intl.DateTimeFormat(locale, options));
  const plural = formatterCache(options => new Intl.PluralRules(locale, options));
  const relativeTime = formatterCache(options => new Intl.RelativeTimeFormat(locale, options));
  const globalTransformers: Record<string, (value: string, options?: Record<string, any>) => string> = {
    relativeTime(value, { type = 'hour', ...options } = {}) {
      // Calendar units use fixed approximations because the input is a duration.
      const seconds: Record<string, number> = {
        second: 1, minute: 60, hour: 3600, day: 86400, week: 604800,
        month: 2592000, quarter: 7776000, year: 31536000,
      };
      const unit = type.replace(/s$/, '');
      return relativeTime(options).format(Number(value) / 1000 / (seconds[unit] || 1), type);
    },
    date(value, options = {}) {
      const defaults = options.dateStyle || options.timeStyle ? {} : {
        year: 'numeric', month: 'numeric', day: 'numeric',
      };
      return date({ ...defaults, ...options }).format(value as any);
    },
    time(value, options = {}) {
      const defaults = options.dateStyle || options.timeStyle ? {} : {
        hour: 'numeric', minute: 'numeric', second: 'numeric',
      };
      return date({ ...defaults, ...options }).format(value as any);
    },
    plural(value, { zero, one, two, few, many, other, ...options } = {}) {
      const choices: Record<string, string> = { zero, one, two, few, many, other };
      return (choices[plural(options).select(value as any)] ?? other)?.split('#').join(value);
    },
    number(value, options = {}) {
      return number(options).format(value as any);
    },
  };

  return globalTransformers;
}

export function defaultTransformers() {
  const globalTransformers: Record<string, (value: string, options?: Record<string, any>) => string> = {
    json(value) {
      return JSON.stringify(value);
    },
    select(value, options = {}) {
      return Object.prototype.hasOwnProperty.call(options, value) ? options[value] : options.other;
    },
  };

  return globalTransformers;
}
