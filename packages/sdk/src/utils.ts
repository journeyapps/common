import { HeaderCollector, Headers } from './definitions.js';

export const constructHeaders = (collectors: (HeaderCollector | Headers | undefined)[]): (() => Promise<Headers>) => {
  return async () => {
    let headers: Headers = {};
    for (let collector of collectors) {
      if (!collector) {
        continue;
      }

      if (typeof collector === 'function') {
        headers = {
          ...headers,
          ...((await collector()) || {})
        };
      } else {
        headers = {
          ...headers,
          ...collector
        };
      }
    }
    return headers;
  };
};

/**
 * A small utility to get a key from a map in a case-insensitive way
 */
export const getHeader = (headers: Record<string, string>, key: string) => {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      return [key.toLowerCase(), value];
    })
  )[key.toLowerCase()];
};

/**
 * A weak clone of path.join from node that will work in the browser too. Joins all given
 * strings together with a '/' and then strips off duplicates.
 *
 * ["https://a/b/c/", "/d/e//f/"] => "https://a/b/c///d/e//f/" => "https://a/b/c/d/e/f/"
 */
export const join = (...parts: string[]) => {
  const components = parts.join('/').split(/:\/\//);
  const deduped = (components[1] || components[0]).replace(/\/\/+/g, '/');
  if (components[1]) {
    return [components[0], deduped].join('://');
  }
  return deduped;
};
