import { NavigateOptions, Route } from './Route';
import { buildPath } from './utils';

export interface NavigateToEvent {
  route: Route;
  path: string;
  options: NavigateOptions;
}

export abstract class AbstractRouter {
  routes: Set<Route>;
  currentRoutes: Set<Route>;
  url: string;

  private _flattened: Set<Route>;
  private _listeners: Set<() => any>;

  constructor() {
    this.routes = new Set();
    this._listeners = new Set();
    this._flattened = new Set();
    this.currentRoutes = new Set<Route>();
    this.url = '';
  }

  protected abstract navigateTo(event: NavigateToEvent): void;

  flattened() {
    return Array.from(this._flattened.values());
  }

  addRoute(...routes: Route[]) {
    routes.forEach((r) => {
      const listener = r.registerListener({
        popped: () => {
          this._removeRoute(r);
          listener?.();
        },
        structureUpdated: () => {
          this.recompute();
        }
      });
      this._addRoute(r);
    });
  }

  protected _addRoute(route: Route) {
    this.routes.add(route);
    this.recompute();
  }

  protected _removeRoute(route: Route) {
    this.routes.delete(route);
    if (this.currentRoutes.has(route)) {
      route.iterateListeners((cb) => cb.unMounted?.());
    }
    this.recompute();
  }

  protected recomputeHandlers() {
    // remove all listeners
    this._listeners.forEach((l) => {
      l();
    });
    this._listeners.clear();
    this._flattened.forEach((r) => {
      const l = r.registerListener({
        popped: () => {
          this._listeners.delete(l);
          l();
        },
        mounted: () => {
          this.currentRoutes.add(r);
        },
        unMounted: () => {
          this.currentRoutes.delete(r);
        },
        willNavigate: (event) => {
          const url = buildPath({
            template: r.getTemplate(),
            params: event.params ?? {}
          });
          this.navigateTo({
            route: r,
            path: url,
            options: event
          });
        }
      });

      this._listeners.add(l);
    });
  }

  protected recomputeMatching() {
    let foundMatch = false;
    this._flattened.forEach((r) => {
      const matchedResult = r.match(this.url);
      if (matchedResult) {
        foundMatch = true;
      }
      r.setMatch(matchedResult);
    });

    return foundMatch;
  }

  recompute() {
    this._flattened.clear();
    this.routes.forEach((r) => {
      r.flatten().forEach((r2) => {
        this._flattened.add(r2);
      });
    });
    this.recomputeHandlers();
    this.recomputeMatching();
  }

  visit(url: string) {
    this.url = url;
    return this.recomputeMatching();
  }
}
