import * as _ from 'lodash';

export interface Part {
  name: string;
  parameter: boolean;
}

export const buildPath = (options: { template: string; params: { [key: string]: string } }) => {
  const parsed = parseTemplate(options.template);
  const parts = [...parsed.parts];
  // remove the last /* form the URL
  if (_.last(parts)?.name === '*') {
    parts.splice(parts.length - 1, 1);
  }
  let path = parts
    .map((p) => {
      if (p.parameter) {
        return options.params[p.name];
      }
      return p.name;
    })
    .join('/');

  const query = parsed.query
    .map((q) => {
      const value = options.params[q];
      if (value == null) {
        return null;
      }
      return `${q}=${encodeURIComponent(value)}`;
    })
    .filter((part) => part != null)
    .join('&');

  if (query !== '') {
    path = `${path}?${query}`;
  }
  return path;
};

export interface ParseTemplateResult {
  parts: Part[];
  query: string[];
}

export const parseTemplate = _.memoize((url: string): ParseTemplateResult => {
  // remove whitespace
  let normalized = url.trim();

  if (normalized === '') {
    throw new Error('template cant be empty');
  }

  // remove first slash
  normalized = _.trim(normalized, '/');

  if (normalized === '') {
    return {
      parts: [],
      query: []
    };
  }

  const [path, query] = normalized.split('?');

  let params = new Set();
  const parts = path.split('/').map((p) => {
    if (p.startsWith(':')) {
      if (params.has(p)) {
        throw new Error(`Duplicate parameter '${p}'`);
      }
      params.add(p);
      return {
        name: p.substring(1),
        parameter: true
      } as Part;
    }
    return {
      name: p,
      parameter: false
    } as Part;
  });

  return {
    parts: parts,
    query: query?.split('&') || []
  };
});

export interface ParseURLResult {
  pathname: string;
  params: { [key: string]: string };
}

export const parseValidURL = _.memoize((url: string): ParseURLResult | null => {
  try {
    const urlObject = new URL(url);
    const params: Record<string, string> = {};
    urlObject.searchParams.forEach((value, key, parent) => {
      params[key] = value;
    });
    return {
      pathname: _.trim(urlObject.pathname, '/'),
      params: params
    };
  } catch (ex) {}
  return null;
});

export const parseURL = _.memoize((url: string): ParseURLResult => {
  const parsed = parseValidURL(url);
  if (parsed) {
    return parsed;
  }

  if (!url.startsWith('/')) {
    url = `/${url}`;
  }

  const fallback = parseValidURL(`https://unknown.com/${url}`);
  if (fallback == null) {
    throw new Error(`Invalid URL: ${url}`);
  }
  return fallback;
});
