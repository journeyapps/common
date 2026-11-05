import { AbstractRouter, NavigateToEvent } from './AbstractRouter';
import _ from 'lodash';

export interface HashRouterOptions {
  baseHash?: string;
}

export const BASE_HASH = '#';

export class HashRouter extends AbstractRouter {
  private retried: boolean;
  constructor(
    public options: HashRouterOptions = {
      baseHash: BASE_HASH
    }
  ) {
    super();
    this.retried = false;
  }

  init() {
    addEventListener(
      'hashchange',
      (event) => {
        const matched = this.visitHash(location.hash);
        if (!matched) {
          // if the hash is not matched, we need to reload the page
          if (!this.retried) {
            // we try the old url first
            this.retried = true;
            window.location.replace(event.oldURL);
            return;
          }
          // if we retried and still not matched, we reload to basePath
          this.retried = false;
          window.location.replace(`${location.origin}${location.pathname}`);
          return;
        }
        this.retried = false;
      },
      {
        capture: true
      }
    );
    this.visitHash(location.hash);
  }

  protected navigateTo(event: NavigateToEvent) {
    // We use assign as it keeps history, needed for browser back
    window.location.assign(`${this.options.baseHash}${event.path}`);
  }

  visitHash(hash: string) {
    return this.visit(this.trimHash(hash));
  }

  protected trimHash(hash: string) {
    return _.trimStart(hash, this.options.baseHash);
  }
}
