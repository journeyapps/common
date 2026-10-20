import { BaseObserver } from '@journeyapps/common-utils';
import { ParseTemplateResult, parseTemplate, parseURL } from './utils';
import * as path from 'path';
import * as _ from 'lodash';

export interface RouteMountedEvent<P extends Record<string, string> = Record<string, string>> {
  params: P;
}

export type MatchResult<P extends Record<string, string> = Record<string, string>> =
  | {
      params: P;
    }
  | false;

export interface RouteListener<P extends Record<string, string> = Record<string, string>> {
  mounted(event: RouteMountedEvent<P>): void;
  matched(event: RouteMountedEvent<P>): void;
  unMounted(): void;
  popped(): void;
  structureUpdated(): void;
  willNavigate(options: NavigateOptions<P>): void;
}

export interface NavigateOptions<T extends Record<string, string> = Record<string, string>> {
  params?: T;
  replace?: boolean;
  reset?: boolean;
}

export class Route<P extends Record<string, string> = Record<string, string>> extends BaseObserver<RouteListener<P>> {
  children: Set<Route>;
  parent: Route | null;
  parsed!: ParseTemplateResult;
  matched: MatchResult<P>;

  constructor(public template: string) {
    super();
    this.children = new Set();
    this.parent = null;
    this.matched = false;
    this.compile();
  }

  setMatch(result: MatchResult<P>) {
    // mounts
    if (!this.matched && result) {
      this.matched = result;
      this.iterateListeners((cb) => cb.mounted?.(result));
      this.iterateListeners((cb) => cb.matched?.(result));
    }

    // already mounted but different params
    else if (this.matched && result && !_.isEqual(this.matched, result)) {
      this.matched = result;
      this.iterateListeners((cb) => cb.matched?.(result));
    }
    // unmount
    else if (this.matched && !result) {
      this.matched = result;
      this.iterateListeners((cb) => cb.unMounted?.());
    }
  }

  setParent(route: Route | null) {
    this.parent = route;
    this.compile();
  }

  addChild(route: Route) {
    this.children.add(route);
    route.setParent(this);
    const listener = route.registerListener({
      structureUpdated: () => {
        this.iterateListeners((cb) => cb.structureUpdated?.());
      },
      popped: () => {
        this.children.delete(route);
        this.iterateListeners((cb) => cb.structureUpdated?.());
        route.setParent(null);
        listener?.();
      }
    });
    this.iterateListeners((cb) => cb.structureUpdated?.());
    return this;
  }

  getTemplate(): string {
    if (!this.parent) {
      return this.template;
    }

    let template = this.parent.getTemplate();
    if (template.endsWith('/*')) {
      template = template.substring(0, template.length - 2);
    }
    return path.join(template, this.template);
  }

  compile() {
    this.parsed = parseTemplate(this.getTemplate());
    for (const child of this.children) {
      child.compile();
    }
  }

  flatten(): Route[] {
    let list: Route[] = [this];
    Array.from(this.children.values()).forEach((c) => {
      list.push(...c.flatten());
    });
    return list;
  }

  getParams() {
    return this.parsed.parts.filter((p) => p.parameter).map((p) => p.name);
  }

  navigate(options: NavigateOptions<P> = {}) {
    // check that we have all params
    for (let param of this.getParams()) {
      if (options.params?.[param] == null) {
        throw new Error(`Missing parameter ${param}`);
      }
    }
    this.iterateListeners((cb) => cb.willNavigate?.(options));
  }

  pop() {
    this.iterateListeners((cb) => cb.popped?.());
  }

  match(url: string): MatchResult {
    const parsedUrl = parseURL(url);
    const parts = parsedUrl.pathname.split('/');

    // too long and our last part is not a star
    if (parts.length > this.parsed.parts.length && _.last(this.parsed.parts)?.name !== '*') {
      return false;
    }

    // merge in the query params
    let params = {
      ...parsedUrl.params
    };

    for (let i = 0; i < this.parsed.parts.length; i++) {
      const templatePart = this.parsed.parts[i];
      const urlPart = parts[i];
      if (templatePart.parameter && urlPart) {
        params[templatePart.name] = urlPart;
      } else if (templatePart.name !== '*' && templatePart.name !== urlPart) {
        return false;
      }
    }

    return {
      params
    };
  }
}
