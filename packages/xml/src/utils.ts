import {
  XMLElement,
  XMLNode,
  IterableNodeList,
  XMLCharacterNode,
  CDATA_SECTION_NODE,
  COMMENT_NODE
} from '@journeyapps/domparser/types';

// From: http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
// These constants are also defined one Node, but it's better to not
// depend on the availability of the Node object.
export const ELEMENT_NODE = 1;
export const ATTRIBUTE_NODE = 2;
export const TEXT_NODE = 3;
export const DOCUMENT_NODE = 9;

export function isAttribute(node: unknown): node is AttributeNode {
  return (
    (node as Node).nodeType == ATTRIBUTE_NODE ||
    (typeof (node as AttributeNode).name == 'string' && typeof (node as AttributeNode).ownerElement == 'object')
  );
}

export function isElement(node: unknown): node is XMLElement {
  return (node as Node).nodeType == ELEMENT_NODE;
}

export function isText(node: unknown): node is XMLCharacterNode {
  return (node as XMLNode).nodeType == TEXT_NODE;
}

export function isCdataNode(node: unknown): node is XMLCharacterNode {
  return (node as XMLNode).nodeType == CDATA_SECTION_NODE;
}

export function isCommentNode(node: unknown): node is XMLCharacterNode {
  return (node as XMLNode).nodeType == COMMENT_NODE;
}

/**
 * Subset of the fields we're interested in.
 */
export interface AttributeNode {
  ownerElement: XMLElement;
  name: string;
  value: string;
}

/**
 * Set or clear a set of attributes.
 *
 * If an attribute value is either null or matches the default, and the current
 * element attribute value is also either null or matches the default, it is preserved.
 * If the current element attribute value is anything else, it is removed.
 *
 * @param element - The element to set the attributes on
 * @param attributes - The attributes to set.
 *   A value of null or undefined removes the attribute.
 *   If an attribute is present in the element but not this map, it is preserved.
 * @param defaults - Default attribute values, which are treated the same as not present.
 */
export function setAttributes(
  element: XMLElement,
  attributes: { [key: string]: string | null },
  defaults?: { [key: string]: string }
) {
  if (defaults == null) {
    defaults = {};
  }
  for (let key in attributes) {
    const value = attributes[key];
    const defaultValue = defaults[key];
    if (value == null || value === defaultValue) {
      if (element.getAttribute(key) !== defaultValue) {
        // The attribute is not currently equal to the default value, so we remove it.
        element.removeAttribute(key);
      } else {
        // The element currently contains the default value explicitly.
        // We preserve it.
      }
    } else {
      element.setAttribute(key, value);
    }
  }
}

/**
 * xmldom childNodes aren't iterable, but we can use to wrap it.
 * @param items
 */
export function iter<T extends XMLNode>(items: IterableNodeList<T>): Iterable<T> {
  return {
    [Symbol.iterator]: (): Iterator<T> => {
      let i = 0;
      return {
        next(_value?: any): IteratorResult<T> {
          if (i >= items.length) {
            return {
              done: true,
              value: undefined
            };
          } else {
            const item = items[i++];
            return {
              done: false,
              value: item
            };
          }
        }
      };
    }
  };
}
