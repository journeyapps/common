# JourneyApps Common

Shared TypeScript libraries used across JourneyApps projects, including JourneyApps Platform. Each package is published independently under the `@journeyapps/common-*` scope.

## Packages

| Package | Purpose |
| --- | --- |
| [@journeyapps/common-codec](packages/codec) | Function, promise and external-type codecs, plus serialization of codec definitions. |
| [@journeyapps/common-docs](packages/docs) | TypeDoc and Docusaurus documentation helpers. |
| [@journeyapps/common-ioc](packages/ioc) | Inversion of control and dependency injection. |
| [@journeyapps/common-logger](packages/logger) | Named loggers, inherited configuration, styled values and console transports. |
| [@journeyapps/common-router](packages/router) | Composable route trees with in-memory and browser hash routers. |
| [@journeyapps/common-sdk](packages/sdk) | Shared API client, fetch and streaming infrastructure for Node.js and browsers. |
| [@journeyapps/common-tree](packages/tree) | Observable tree entities and nodes. |
| [@journeyapps/common-utils](packages/utils) | Shared observer primitives. |
| [@journeyapps/common-xml](packages/xml) | XML parsing, serialization, element construction and incremental updates. |

Install the packages you need directly. `common-sdk` provides API client infrastructure; it is not an umbrella export of this workspace.

## Development

Use the Node.js version in [.nvmrc](.nvmrc) and the pnpm version declared in [package.json](package.json).

```sh
pnpm install
pnpm build
pnpm test
```

The root build uses TypeScript project references. Packages extend [tsconfig.base.json](tsconfig.base.json), and [tsconfig.json](tsconfig.json) lists the build projects. Add new packages to that list and declare workspace dependencies in their manifests.

```sh
pnpm watch
pnpm format
pnpm --filter @journeyapps/common-codec test
pnpm --filter @journeyapps/common-router test
```

`pnpm test` runs each package's test script. The XML package includes browser tests as well as Node.js tests. Pull requests run formatting checks, the workspace build and tests.

## Release

The initial publish under the `@journeyapps` scope requires an `NPM_TOKEN` secret in the `npm` GitHub environment. After every package has been published once, configure npm trusted publishing for this repository and `.github/workflows/release.yml`, then remove the `NODE_AUTH_TOKEN` entries from the workflow and the `NPM_TOKEN` secret.

### Dev release

1. Run `pnpm changeset` and select the affected packages.
2. Run the [Release workflow](https://github.com/journeyapps/common/actions/workflows/release.yml) manually on the branch to publish. It creates a `dev` snapshot and publishes it with the `dev` npm tag.

### Production release

1. Include a changeset with changes that need publishing.
2. Merge the pull request into `main`.
3. Review and merge the versioning pull request created by Changesets. The release workflow then publishes the updated packages.
