export function intlTransformers(locale: string = 'en-GB') {
  const globalTransformers: Record<string, (value: string, options?: Record<string, any>) => string> = {
    relativeTime(value, { type = 'hour', ...options } = {}) {
      return new Intl.RelativeTimeFormat(locale, {
        ...options,
      }).format(Number(value) / 1000 / 60 / 60, type);
    },
    date(value) {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(value as any);
    },
    time(value) {
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).format(value as any);
    },
    plural(value, { type = 'cardinal', ...options } = {}) {
      return options[new Intl.PluralRules(locale, { type }).select(value as any)]?.replace('#', value);
    },
    number(value, { style, currency, unit, unitDisplay, maximumSignificantDigits } = {}) {
      return new Intl.NumberFormat(locale, {
        style,
        currency,
        unit,
        unitDisplay,
        maximumSignificantDigits,
      }).format(value as any);
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
      return options[value] || options.other;
    },
  };

  return globalTransformers;
}
