# JourneyApps Common

Common packages used in JourneyApps repositories.

## Release

The initial publish under the `@journeyapps` scope requires an `NPM_TOKEN` secret in the `npm` GitHub environment. After every package has been published once, configure npm trusted publishing for this repository and `.github/workflows/release.yml`, then remove the `NODE_AUTH_TOKEN` entries from the workflow and the `NPM_TOKEN` secret.

### Dev release

1. Ensure a changeset has been created `pnpm changeset`
2. Run https://github.com/journeyapps/common/actions/workflows/release.yml manually on the branch you need

### Production release

1. Ensure a changeset has been created `pnpm changeset`
2. Merge PR and then merge the versions PR which gets created.
