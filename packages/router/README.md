# JourneyApps Common Router

A composable routing library that allows you to work with routes as a tree of objects, published as `@journeyapps/common-router`.

## Usage

```ts
import { MemoryRouter, Route } from '@journeyapps/common-router';

const router = new MemoryRouter();
const users = new Route('/users/*');
const profile = new Route<{ userId: string }>('/:userId');

users.addChild(profile);
router.addRoute(users);

const unsubscribe = profile.registerListener({
  mounted: ({ params }) => {
    console.log('Viewing user', params.userId);
  }
});

profile.navigate({ params: { userId: 'alice' } });
unsubscribe();
```

Routes support named path parameters (`:userId`), trailing wildcards (`/*`) and query parameter names in templates (`/users?search`). A child route's template is relative to its parent.

`MemoryRouter` matches routes without changing the browser URL. `HashRouter` uses the browser's hash and starts listening for changes when you call `init()`:

```ts
import { HashRouter, Route } from '@journeyapps/common-router';

const router = new HashRouter({ baseHash: '#/' });
router.addRoute(new Route('/settings'));
router.init();
```

Use `buildPath({ template, params })` to construct a path without navigating. Route listeners include `mounted`, `matched`, `unMounted` and `popped`; keep and call the unsubscribe function when a consumer no longer needs events.

## Development

From the workspace root:

```sh
pnpm build
pnpm --filter @journeyapps/common-router test
```
