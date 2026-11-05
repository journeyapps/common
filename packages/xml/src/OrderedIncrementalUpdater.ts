import { XMLElement, XMLNode } from '@journeyapps/domparser/types';
import { isElement, isText } from './index';
import { ElementBuilder } from './ElementBuilder';

/**
 * XML diff builder where parsed data is considered ordered, and this order must be preserved.
 *
 * The parsed order may be different from the source order, if the order has changed in the meantime.
 * In that case, we re-order the output, while attempting to keep a reasonable order for the unknown elements.
 *
 * Example is single-choice options, or views.
 *
 * The process merges two lists of data:
 * 1. The source child nodes (A). This includes comments, text nodes, known and unknown elements.
 * 2. The new data (B).
 *
 * The process:
 * 1. Iterate through all the elements in B, and generate (or update) nodes, placing them in the new list.
 * 2. Insert all source nodes (A) not covered by the above, in reverse. The insert position for node A_i is right before A_(i+1).
 *
 * > Why before a known node instead of after?
 * Comments are generally placed before the associated element, so we try to preserve this connection.
 */
export class OrderedIncrementalUpdater {
  private builders: {
    sourceElement: XMLElement | null;
    builder: ElementBuilder;
  }[] = [];

  private tagMap: { [tag: string]: boolean } = {};

  /**
   * null means clear; undefined means unchanged.
   */
  private textContent: string | null | undefined;

  constructor(
    public sourceElement: XMLElement | null,
    handledTags: string[]
  ) {
    for (let tag of handledTags) {
      this.tagMap[tag] = true;
    }
  }

  append(sourceElement: XMLElement | null, builder: ElementBuilder): void {
    this.builders.push({ sourceElement, builder });
  }

  /**
   * If there is an existing text node, replace it.
   * If there are multiple text nodes, remove all after the first one.
   * If there are no text nodes, append one.
   *
   * @param text The text, or null to clear.
   */
  setTextContent(text: string | null) {
    this.textContent = text;
  }

  update(element: XMLElement) {
    const doc = element.ownerDocument;

    // Map from sourceElement -> new element, for the purpose of insertBefore.
    let positionMap = new Map<XMLNode, XMLNode>();

    // 1. Insert new elements.
    for (let b of this.builders) {
      const { builder, sourceElement } = b;
      if (sourceElement) {
        // Update existing node
        let clone = sourceElement.cloneNode(builder.cloneDeep) as XMLElement;
        builder.update(clone);
        element.appendChild(clone);
        positionMap.set(sourceElement, clone);
      } else {
        // Create new node
        const newChild = doc.createElement(builder.tagName);
        builder.update(newChild);
        element.appendChild(newChild);
      }
    }

    // 2. Merge source elements.

    let seenSourceText = false;
    if (this.sourceElement) {
      const sourceNodes = this.sourceElement.childNodes;
      let insertBefore = null;
      for (let i = sourceNodes.length - 1; i >= 0; i--) {
        const child = sourceNodes[i];
        if (positionMap.has(child)) {
          // Already inserted.
          insertBefore = positionMap.get(child);
        } else if (isElement(child) && this.tagMap[child.tagName]) {
          // A known element that isn't inserted already.
          // Skip it.
        } else if (isText(child) && this.textContent !== undefined) {
          // Skip any nodes after the first one.
          if (!seenSourceText) {
            if (this.textContent !== null) {
              // Replace the text
              const textNode = doc.createTextNode(this.textContent);
              if (insertBefore) {
                element.insertBefore(textNode, insertBefore);
              } else {
                element.appendChild(textNode);
              }
            }
            seenSourceText = true;
          }
        } else {
          // Insert before the last known one
          const clone = child.cloneNode(true);
          if (insertBefore) {
            element.insertBefore(clone, insertBefore);
          } else {
            element.appendChild(clone);
          }
          insertBefore = clone;
        }
      }
    }

    if (!seenSourceText && this.textContent !== undefined && this.textContent !== null) {
      // No source text found - append text
      element.appendChild(doc.createTextNode(this.textContent));
    }
  }
}
