import { XMLElement } from '@journeyapps/domparser/types';

export interface ElementBuilder {
  /**
   * The tag name to use when creating a new element.
   */
  tagName: string;
  /**
   * The function to call on a new or existing element.
   */
  update: UpdateFunction;
  /**
   * When an existing element is cloned, should its children be included?
   */
  cloneDeep?: boolean;
}

export type UpdateFunction = (element: XMLElement) => void;
