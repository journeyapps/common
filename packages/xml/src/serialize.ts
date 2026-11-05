import {
  DOCUMENT_FRAGMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  ENTITY_REFERENCE_NODE,
  PROCESSING_INSTRUCTION_NODE,
  XMLAttribute,
  XMLElement,
  XMLNode,
  XMLSerializer
} from '@journeyapps/domparser/types';
import { isAttribute, isCdataNode, isCommentNode, isElement, isText } from './utils';
import { XMLNodeLike } from '@journeyapps/domparser/lib/XMLNode';

// Rough adaption from https://github.com/backslash47/xmldom/blob/8bfe4a6bc184300f0ef68a42ddf8c7219ad55882/src/serializer/serialize.ts
// MIT Licensed

// We use this custom serializer instead of the built-in one, so that we
// have some more control over the formatting, such as adding a space before a closing tag.

interface VisibleNamespace {
  namespace: string;
  prefix: string | null;
}

type NodeFilter = (node: XMLNodeLike) => XMLNode | string;

export const serializer: XMLSerializer = {
  serializeToString: serialize
};

export function serialize(node: XMLNodeLike, nodeFilter?: NodeFilter) {
  let buf: string[] = [];
  const refNode = node.nodeType == 9 ? (node as any).documentElement : node;
  let prefix = refNode.prefix;
  const uri = refNode.namespaceURI;
  let visibleNamespaces: VisibleNamespace[] = [];

  if (uri && prefix == null) {
    prefix = refNode.lookupPrefix(uri);
    if (prefix == null) {
      visibleNamespaces = [{ namespace: uri, prefix: null }];
    }
  }
  serializeToString(node, buf, nodeFilter, visibleNamespaces);
  return buf.join('');
}

function needNamespaceDefine(node: XMLElement | XMLAttribute, visibleNamespaces: VisibleNamespace[]) {
  const prefix = node.prefix || '';
  const uri = node.namespaceURI;
  if (!prefix && !uri) {
    return false;
  }
  if ((prefix === 'xml' && uri === 'http://www.w3.org/XML/1998/namespace') || uri == 'http://www.w3.org/2000/xmlns/') {
    return false;
  }

  let i = visibleNamespaces.length;
  while (i--) {
    const ns = visibleNamespaces[i];
    if (ns.prefix == prefix) {
      return ns.namespace != uri;
    }
  }
  return true;
}

function serializeToString(
  node: XMLNodeLike,
  buf: string[],
  nodeFilter?: NodeFilter,
  visibleNamespaces?: VisibleNamespace[]
) {
  if (nodeFilter) {
    const filtered = nodeFilter(node);
    if (filtered) {
      if (typeof filtered == 'string') {
        buf.push(filtered);
        return;
      } else {
        node = filtered;
      }
    } else {
      return;
    }
  }

  if (isElement(node)) {
    if (!visibleNamespaces) {
      visibleNamespaces = [];
    }
    const attrs = node.attributes;
    const len = attrs.length;
    let child = node.firstChild;
    const nodeName = node.tagName;

    buf.push('<', nodeName);

    for (let i = 0; i < len; i++) {
      // add namespaces for attributes
      const attr = attrs.item(i)!;
      if (attr.prefix == 'xmlns') {
        visibleNamespaces.push({
          prefix: attr.localName,
          namespace: attr.value
        });
      } else if (attr.nodeName == 'xmlns') {
        visibleNamespaces.push({ prefix: '', namespace: attr.value });
      }
    }
    for (let i = 0; i < len; i++) {
      const attr = attrs.item(i)!;
      if (needNamespaceDefine(attr, visibleNamespaces)) {
        const prefix = attr.prefix || '';
        const uri = attr.namespaceURI ?? '';
        const ns = prefix ? ' xmlns:' + prefix : ' xmlns';
        buf.push(ns, '="', uri, '"');
        visibleNamespaces.push({ prefix: prefix, namespace: uri });
      }
      serializeToString(attr, buf, nodeFilter, visibleNamespaces);
    }
    // add namespace for current node
    if (needNamespaceDefine(node, visibleNamespaces)) {
      const prefix = node.prefix || '';
      const uri = node.namespaceURI;
      const ns = prefix ? ' xmlns:' + prefix : ' xmlns';
      buf.push(ns, '="', uri, '"');
      visibleNamespaces.push({ prefix: prefix, namespace: uri });
    }

    if (child) {
      buf.push('>');
      //if is cdata child node
      while (child) {
        serializeToString(child, buf, nodeFilter, visibleNamespaces);
        child = child.nextSibling;
      }
      buf.push('</', nodeName, '>');
    } else {
      buf.push(' />');
    }
  } else if (node.nodeType == DOCUMENT_NODE || node.nodeType == DOCUMENT_FRAGMENT_NODE) {
    let child = (node as XMLNode).firstChild;
    while (child) {
      serializeToString(child, buf, nodeFilter, visibleNamespaces);
      child = child.nextSibling;
    }
  } else if (isAttribute(node)) {
    buf.push(' ', node.name, '="', node.value.replace(/[<&"]/g, _xmlEncoder), '"');
  } else if (isText(node)) {
    buf.push(node.data.replace(/[<&]/g, _xmlEncoder));
  } else if (isCdataNode(node)) {
    buf.push('<![CDATA[', node.data, ']]>');
  } else if (isCommentNode(node)) {
    buf.push('<!--', node.data, '-->');
  } else if (node.nodeType == DOCUMENT_TYPE_NODE) {
    const docTypeNode = node as any;
    const pubid = docTypeNode.publicId;
    const sysid = docTypeNode.systemId;
    buf.push('<!DOCTYPE ', docTypeNode.name);
    if (pubid) {
      buf.push(' PUBLIC "', pubid);
      if (sysid && sysid != '.') {
        buf.push('" "', sysid);
      }
      buf.push('">');
    } else if (sysid && sysid != '.') {
      buf.push(' SYSTEM "', sysid, '">');
    } else {
      const sub = docTypeNode.internalSubset;
      if (sub) {
        buf.push(' [', sub, ']');
      }
      buf.push('>');
    }
  } else if (node.nodeType == PROCESSING_INSTRUCTION_NODE) {
    buf.push('<?', (node as any).target, ' ', (node as any).data, '?>');
  } else if (node.nodeType == ENTITY_REFERENCE_NODE) {
    buf.push('&', node.nodeName, ';');
  }
}

function _xmlEncoder(c: string) {
  return (
    (c === '<' && '&lt;') ||
    (c === '>' && '&gt;') ||
    (c === '&' && '&amp;') ||
    (c === '"' && '&quot;') ||
    '&#' + c.charCodeAt(0) + ';'
  );
}
