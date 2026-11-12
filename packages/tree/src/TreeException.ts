import { TreeEntity } from './TreeEntity.js';

export class TreeException extends Error {
  constructor(
    public tree: TreeEntity,
    error: string
  ) {
    super(error);
  }
}
