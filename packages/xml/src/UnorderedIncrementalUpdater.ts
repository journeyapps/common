import { XMLElement, XMLNode } from '@journeyapps/domparser/types';
import { isElement, iter } from './index';
import { ElementBuilder } from './ElementBuilder';

/**
 * XML diff builder where the data is considered unordered, and source order is preserved.
 *
 * This could be used for something like models in a data-model, where order is not important.
 *
 * The disadvantage of this approach is that there is no way to re-order items after parsing,
 * e.g. if the user wants to structure it better. Therefore this is not used currently, but is
 * only kept for reference.
 *
 * The process merges two lists of data:
 * 1. The source child nodes (A). This includes comments, text nodes, known and unknown elements.
 * 2. The new data (B).
 *
 * B will generally be a subset of A, but may contain new elements, removed elements and updated elements.
 *
 * The end result is:
 * 1. A copy of source nodes from A.
 * 2. Remove known elements not in B.
 * 3. Update elements in both A and B with the new data from B. The position here is taken from the source position in A.
 * 4. Insert elements in B but not A. The insert position for element B_i is right after B_(i-1).
 *
 * This approach works even when we don't have the source nodes (A). In this case, everything is handled in
 * step 4.
 */
export class UnorderedIncrementalUpdater {
  private sourceElements: {
    [key: string]: WeakMap<XMLElement, ElementBuilder>;
  } = {};
  private previousNode: XMLNode | undefined;
  private after = new Map<XMLNode | null | undefined, ElementBuilder[]>();
  constructor(
    public sourceElement: XMLElement | null,
    handledTags: string[]
  ) {
    for (let tag of handledTags) {
      this.sourceElements[tag] = new WeakMap();
    }
  }
  append(sourceElement: XMLElement | null, builder: ElementBuilder): void {
    if (sourceElement) {
      this.sourceElements[builder.tagName].set(sourceElement, builder);
      this.previousNode = sourceElement;
    } else {
      if (this.after.has(this.previousNode)) {
        this.after.get(this.previousNode)!.push(builder);
      } else {
        this.after.set(this.previousNode, [builder]);
      }
    }
  }
  update(element: XMLElement) {
    const doc = element.ownerDocument;
    // New children at the start of the element
    for (let builder of this.after.get(null) || []) {
      const newChild = doc.createElement(builder.tagName);
      builder.update(newChild);
      element.appendChild(newChild);
    }
    if (this.sourceElement) {
      // Copy existing children
      for (let child of iter(this.sourceElement.childNodes)) {
        if (isElement(child) && child.tagName in this.sourceElements) {
          if (this.sourceElements[child.tagName].has(child)) {
            // Present - update!
            const builder = this.sourceElements[child.tagName].get(child)!;
            let clone = child.cloneNode(builder.cloneDeep) as XMLElement;
            builder.update(clone);
            element.appendChild(clone);
          } else {
            // Deleted
          }
        } else {
          // Not a handled tag - clone.
          element.appendChild(child.cloneNode(true));
        }
        // Add new elements that should be after this one.
        for (let field of this.after.get(child) || []) {
          const newChild = doc.createElement(field.tagName);
          field.update(newChild);
          element.appendChild(newChild);
        }
      }
    }
  }
}
