import { expect, test } from 'vitest';
import { Route } from '../src/Route';
import { buildPath, parseTemplate, parseURL } from '../src/utils';
import { MemoryRouter } from '../src/MemoryRouter';
import { HashRouter } from '../src/HashRouter';

test('template parsing', () => {
  expect(() => {
    parseTemplate('');
  }).toThrowError('template cant be empty');

  expect(parseTemplate('/').parts).toEqual([]);

  expect(parseTemplate('/users?a&b')).toEqual({
    parts: [
      {
        name: 'users',
        parameter: false
      }
    ],
    query: ['a', 'b']
  });

  expect(parseTemplate('users').parts).toEqual([
    {
      name: 'users',
      parameter: false
    }
  ]);

  expect(parseTemplate('/users/cars').parts).toEqual([
    {
      name: 'users',
      parameter: false
    },
    {
      name: 'cars',
      parameter: false
    }
  ]);

  expect(parseTemplate('users/cars/').parts).toEqual([
    {
      name: 'users',
      parameter: false
    },
    {
      name: 'cars',
      parameter: false
    }
  ]);

  expect(parseTemplate('/users/:param1').parts).toEqual([
    {
      name: 'users',
      parameter: false
    },
    {
      name: 'param1',
      parameter: true
    }
  ]);

  expect(parseTemplate('/users/:param1/something').parts).toEqual([
    {
      name: 'users',
      parameter: false
    },
    {
      name: 'param1',
      parameter: true
    },
    {
      name: 'something',
      parameter: false
    }
  ]);

  expect(parseTemplate('/users/:param1/something/:param2').parts).toEqual([
    {
      name: 'users',
      parameter: false
    },
    {
      name: 'param1',
      parameter: true
    },
    {
      name: 'something',
      parameter: false
    },
    {
      name: 'param2',
      parameter: true
    }
  ]);

  expect(() => {
    parseTemplate('/users/cars/:param1/something/:param1');
  }).toThrowError(`Duplicate parameter ':param1'`);
});

test('template construction', () => {
  expect(
    buildPath({
      template: '/users/:user?param_a&param_b',
      params: {
        user: 'a',
        param_a: 'b',
        param_b: 'c'
      }
    })
  ).toEqual('users/a?param_a=b&param_b=c');
});

test('Route construction', () => {
  const route1 = new Route('/cars');
  expect(route1.parsed.parts).toEqual([
    {
      name: 'cars',
      parameter: false
    }
  ]);

  const route2 = new Route('/users');
  expect(route2.parsed.parts).toEqual([
    {
      name: 'users',
      parameter: false
    }
  ]);

  route1.addChild(route2);
  expect(route1.flatten().length).toBe(2);
  expect(route2.parsed.parts).toEqual([
    {
      name: 'cars',
      parameter: false
    },
    {
      name: 'users',
      parameter: false
    }
  ]);

  // test popping
  route2.pop();
  expect(route1.flatten().length).toBe(1);
  expect(route2.parsed.parts).toEqual([
    {
      name: 'users',
      parameter: false
    }
  ]);
});

test('URL Parsing', () => {
  const parsed1 = parseURL('https://test.com/cars/users/something/?and=something#!/something');
  expect(parsed1.pathname).toEqual('cars/users/something');
  expect(parsed1.params).toEqual({
    and: 'something'
  });

  const parsed2 = parseURL('cars/users/something/?things=true#derp');
  expect(parsed2.pathname).toEqual('cars/users/something');
  expect(parsed2.params).toEqual({
    things: 'true'
  });

  const parsed3 = parseURL('cars/users/something#derp');
  expect(parsed3.pathname).toEqual('cars/users/something');
});

test('Route matching', () => {
  const route1 = new Route('/cars/users/');
  expect(route1.match('https://test.com/cars/users')).toBeTruthy();
  expect(route1.match('https://test.com/cars')).toBeFalsy();
  expect(route1.match('https://test.com/cars/users/something')).toBeFalsy();

  const route2 = new Route('/cars/users/*');
  expect(route2.match('https://test.com/cars/users')).toBeTruthy();
  expect(route2.match('https://test.com/cars')).toBeFalsy();
  expect(route2.match('https://test.com/cars/users/something/else')).toBeTruthy();

  const route3 = new Route('/cars/*/something');
  expect(route3.match('https://test.com/cars/*/something')).toBeTruthy();
  expect(route3.match('https://test.com/cars/users/something')).toBeTruthy();
  expect(route3.match('https://test.com/cars//something')).toBeTruthy();
  expect(route3.match('https://test.com/cars/users/something2')).toBeFalsy();

  const route4 = new Route('/cars/*/:param1/:param2');
  expect(route4.match('https://test.com/cars/null/something1/something2')).toEqual({
    params: {
      param1: 'something1',
      param2: 'something2'
    }
  });
  expect(route4.match('https://test.com/cars/null/something1')).toBeFalsy();
  expect(route4.match('cars/null/something1')).toBeFalsy();
  expect(route4.match('cars/null/something1/something2')).toEqual({
    params: {
      param1: 'something1',
      param2: 'something2'
    }
  });

  const route5 = new Route('/cars/*');
  const route6 = new Route('/users');
  route5.addChild(route6);
  expect(route5.match('https://test.com/cars/something')).toBeTruthy();
  expect(route6.getTemplate()).toEqual('/cars/users');
});

test('Route matching', () => {
  const router = new MemoryRouter();

  let stack: string[] = [];
  const createRoute = (template: string) => {
    const route = new Route(template);
    route.registerListener({
      mounted: () => {
        stack.push(`mount:${template}`);
      },
      unMounted: () => {
        stack.push(`unmount:${template}`);
      }
    });
    return route;
  };

  const route1 = createRoute('/parent1');
  const route2 = createRoute('/child1');
  const route3 = createRoute('/child2');

  route1.addChild(route2);
  route1.addChild(route3);

  router.addRoute(route1);

  expect(stack).toEqual([]);
  router.visit('https://test.com/parent1');
  expect(stack).toEqual(['mount:/parent1']);
  router.visit('https://test.com/parent1/child1');
  expect(stack).toEqual(['mount:/parent1', 'unmount:/parent1', 'mount:/child1']);

  // !---------- test nesting -----------
  stack = [];

  const route4 = createRoute('/parent2/*');
  const route5 = createRoute('/child3');
  const route6 = createRoute('/child4');

  route4.addChild(route5);
  route4.addChild(route6);
  router.addRoute(route4);

  router.visit('https://test.com/parent2/child4');
  expect(stack).toEqual(['unmount:/child1', 'mount:/parent2/*', 'mount:/child4']);

  router.visit('https://test.com/parent2/child5');
  expect(stack).toEqual(['unmount:/child1', 'mount:/parent2/*', 'mount:/child4', 'unmount:/child4']);
});

test('Hash router', () => {
  const route1 = new Route('/settings/diagnostics');
  const router = new HashRouter({
    baseHash: '#!/'
  });
  router.addRoute(route1);
  router.visitHash('#!/settings/diagnostics');
  expect(Array.from(router.currentRoutes.values())[0]).toBe(route1);

  const router2 = new HashRouter();
  const route2 = new Route('/settings/diagnostics');
  router2.addRoute(route2);
  router2.visitHash('#settings/diagnostics');
  expect(Array.from(router2.currentRoutes.values())[0]).toBe(route2);
});

test('Navigating', () => {
  const route1 = new Route('/users/*');
  const route2 = new Route<{ car: string }>('/cars/:car');
  route1.addChild(route2);
  const router = new MemoryRouter();
  router.addRoute(route1);
  route1.navigate();
  expect(Array.from(router.currentRoutes.values())[0]).toBe(route1);
  expect(() => {
    route2.navigate();
  }).toThrowError();

  route2.navigate({ params: { car: '1234' } });
  expect(Array.from(router.currentRoutes.values())[0]).toBe(route1);
  expect(Array.from(router.currentRoutes.values())[1]).toBe(route2);

  let matched = false;
  route2.registerListener({
    matched: () => {
      matched = true;
    }
  });
  // dont rematch if params are the same
  route2.navigate({ params: { car: '1234' } });
  expect(matched).toEqual(false);
});
