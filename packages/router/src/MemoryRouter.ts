import { AbstractRouter, NavigateToEvent } from './AbstractRouter.js';

export class MemoryRouter extends AbstractRouter {
  protected navigateTo(event: NavigateToEvent) {
    this.visit(event.path);
  }
}
