import { BaseObserver } from '@journeyapps/common-utils';
import { TreeNode } from './TreeNode';

export enum PathEntryType {
  CHILD = 'child',
  ROOT = 'index',
  ATTR = 'attr'
}

export type PathEntry = [PathEntryType, string | number];

export type Path = PathEntry[];

export interface TreeEntityInterface {
  getPath(): Path;
  getPathAsString(): string;
  getRoot(): TreeEntity;
  getKey(): string;
  delete(): void;
  getParent<T extends TreeNode>(): T;
}

export interface FlattenOptions {
  filter?: (entity: TreeEntity) => boolean;
}

export interface TreeEntityListener {
  deleted: () => any;
}

export class TreeEntity<T extends TreeEntityListener = TreeEntityListener>
  extends BaseObserver<T>
  implements TreeEntityInterface
{
  protected parent: TreeNode | null;
  private _cache: string | null;

  constructor(private key: string) {
    super();
    this._cache = null;
    this.parent = null;
  }

  getKey() {
    return this.key;
  }

  delete() {
    this.iterateListeners((cb) => cb.deleted?.());
  }

  setParent(parent: TreeNode | null) {
    this.parent = parent;
    this._cache = null;
  }

  getPathAsString(): string {
    if (!this._cache) {
      this._cache = JSON.stringify(this.getPath());
    }
    return this._cache;
  }

  open(options: { reveal?: boolean } = {}) {
    if (options.reveal && this.parent) {
      this.parent.open(options);
    }
  }

  getParent<T extends TreeNode>(): T {
    return this.parent as T;
  }

  getPathEntryType() {
    return PathEntryType.ATTR;
  }

  getPath(): Path {
    let path = [[this.getPathEntryType(), this.key]] as Path;
    if (!this.parent) {
      return path;
    }
    return [...this.parent.getPath(), ...path];
  }

  flatten(options?: FlattenOptions): TreeEntity[] {
    if (options?.filter?.(this) === false) {
      return [];
    }
    return [this];
  }

  getRoot(): TreeEntity {
    if (this.parent) {
      return this.parent.getRoot();
    }
    return this;
  }
}
