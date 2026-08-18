# @journeyapps/common-sdk

## 1.0.9

### Patch Changes

- 635ac04: Use the public JourneyApps Micro v2 packages.

## 1.0.8

### Patch Changes

- ca147cd: Publish Common packages under the `@journeyapps` scope after moving the repository to the JourneyApps GitHub organization.

## 1.0.7

### Patch Changes

- 72b3575: Update the workspace toolchain and package dependencies, including TypeScript 7 compatibility.

## 1.0.6

### Patch Changes

- 5d59ecb: Allow specifying a custom `encoder`, similar to the existing `decoder` field, for a fetch client requests.
  Check if the user declared codec contains a decode for the matching type and fall back to the default codec if it doesn't instead of just always using the default codec.

## 1.0.5

### Patch Changes

- d2ed142: Removed unused uuid dependency

## 1.0.4

### Patch Changes

- 22f9b88: Update dependencies to remove vitest as a production dependency.

## 1.0.3

### Patch Changes

- 6938e8a: Bump all dependencies

## 1.0.2

### Patch Changes

- 44f7805: Bump deps

## 1.0.1

### Patch Changes

- 82fa525: Fix types

## 1.0.0

### Major Changes

- c7a1fd6: Initial release
