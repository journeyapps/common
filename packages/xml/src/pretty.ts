import { DOCUMENT_NODE, PROCESSING_INSTRUCTION_NODE, XMLNode, XMLDocument } from '@journeyapps/domparser/types';
import { isElement, isText } from './utils';
import { serializer } from './serialize';

export interface PrettyOptions {
  /**
   * Number of spaces per indentation level. Defaults to 4.
   */
  indentSpaces: number;
}

/**
 * Given a document, return a copy that is formatted.
 *
 * @param document Any parsed XML document.
 */
export function pretty(document: XMLDocument, options?: Partial<PrettyOptions>): XMLDocument {
  const newDoc = document.implementation.createDocument(document.documentElement.tagName, null, null);
  const actualOptions: PrettyOptions = {
    indentSpaces: 4,
    ...options
  };
  for (let i = 0; i < document.childNodes.length; i++) {
    const child = document.childNodes.item(i);
    if (isText(child)) {
      // workaround for xmldom that has text nodes in the document
      continue;
    }
    const formatted = prettyNode(newDoc, child, actualOptions, 0);
    if (formatted) newDoc.appendChild(formatted);
  }
  return newDoc;
}

function isDocument(document: XMLDocument | XMLNode): document is XMLDocument {
  return document.nodeType == DOCUMENT_NODE;
}

export function prettyText(node: XMLDocument | XMLNode, options?: Partial<PrettyOptions>): string {
  if (isDocument(node)) {
    const doc = pretty(node, options);
    return serializeToString(doc);
  } else {
    const actualOptions: PrettyOptions = {
      indentSpaces: 4,
      ...options
    };
    if (!node.ownerDocument) throw new Error('Cannot format a node without an owner document');
    const prettyElement = prettyNode(node.ownerDocument, node, actualOptions, 0);
    return prettyElement ? serializeToString(prettyElement) : '';
  }
}

export function serializeToString(node: XMLNode) {
  if (node.nodeType != DOCUMENT_NODE) {
    // Not a document - use the default
    return serializer.serializeToString(node);
  }

  // Whitespace characters between processing instructions are lost, and browsers serialize them differently.
  // We write these individually, and include newline characters in between them.
  // Note that our DOMParser is the only one that saves the processing instructions in the DOM, browsers don't do this.

  let result = '';
  if (node.firstChild && node.firstChild.nodeType == PROCESSING_INSTRUCTION_NODE) {
    // Has a processing instruction.
  } else {
    // No processing instruction - add it.
    result = '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isText(child)) {
      // Workaround for xmldom inserting extra newlines
      continue;
    }
    const part = serializer.serializeToString(child);
    result += part;
    result += '\n';
  }
  return result;
}

/**
 * Given a document, strip all whitespace without meaning.
 *
 * Newlines are preserved to some extent.
 *
 * @param document Any parsed XML document.
 */
export function stripWhitespace(document: XMLDocument): XMLDocument {
  const newDoc = document.implementation.createDocument(document.documentElement.tagName, null, null);
  for (let i = 0; i < document.childNodes.length; i++) {
    const child = document.childNodes.item(i);
    const formatted = prettyNode(newDoc, child, null, null);
    if (formatted) newDoc.appendChild(formatted);
  }
  return newDoc;
}

function indent(n: number, options: PrettyOptions) {
  let r = '\n';
  for (let i = 0; i < n * options.indentSpaces; i++) {
    r += ' ';
  }
  return r;
}

const NEW_LINE = {} as XMLNode;
const DOUBLE_NEW_LINE = {} as XMLNode;

function removeFinalNewline(text: string) {
  const lines = text.split('\n');
  if (/^\s*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }

  return lines.join('\n');
}

function prettyNode(
  doc: XMLDocument,
  node: XMLNode,
  options: PrettyOptions | null,
  level: number | null
): XMLNode | null {
  let newNode = node.cloneNode(false);
  if (isText(node)) {
    const trimmedText = node.data.trim();
    const newLines = node.data.split('\n').length - 1;
    if (trimmedText == '') {
      if (newLines > 2) {
        return DOUBLE_NEW_LINE;
      } else if (newLines > 1) {
        return NEW_LINE;
      } else {
        return null;
      }
    } else {
      return doc.createTextNode(node.data);
    }
  } else if (isElement(node)) {
    let filteredChildren: XMLNode[] = [];
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes.item(i);
      const formatted = prettyNode(doc, child, options, level == null ? null : level + 1);
      if (formatted) filteredChildren.push(formatted);
    }
    if (filteredChildren.length == 1 && isText(filteredChildren[0])) {
      // Text on its own. Preserve whitespace.
      newNode.appendChild(filteredChildren[0]);
    } else if (filteredChildren.length > 0) {
      for (let child of filteredChildren) {
        if (child == null) {
          continue;
        } else if (child == NEW_LINE) {
          if (level == null) {
            newNode.appendChild(doc.createTextNode('\n\n'));
          } else {
            newNode.appendChild(doc.createTextNode('\n'));
          }
        } else if (child == DOUBLE_NEW_LINE) {
          if (level == null) {
            newNode.appendChild(doc.createTextNode('\n\n\n'));
          } else {
            newNode.appendChild(doc.createTextNode('\n\n'));
          }
        } else {
          if (isText(child)) {
            // Text in mixed-mode.
            // We currently preserve whitespace _before_ the text element, but not _after_.
            // If the last line is a blank line, remove it, and replace it with our indentation.
            let text = child.data;
            newNode.appendChild(doc.createTextNode(removeFinalNewline(text)));
          } else {
            if (level != null && options != null) {
              const indentation = indent(level + 1, options);
              newNode.appendChild(doc.createTextNode(indentation));
            }
            newNode.appendChild(child);
          }
        }
      }
      if (level != null && options != null) {
        newNode.appendChild(doc.createTextNode(indent(level, options)));
      }
    }
  }
  return newNode;
}
