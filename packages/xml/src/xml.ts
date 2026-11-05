import { XMLSerializer } from '@journeyapps/domparser';
import { DOMImplementation, XMLDocument, XMLDOMParser, XMLElement, XMLPosition } from '@journeyapps/domparser/types';
import { AttributeNode, isAttribute, isElement, TEXT_NODE } from './utils';

export interface ConfiguredParser {
  parser: XMLDOMParser;
  serializer: XMLSerializer;
  implementation: DOMImplementation;
}

let configuredParser: ConfiguredParser | null = null;

export interface XMLRange {
  start: XMLPosition | null | undefined;
  end: XMLPosition | null | undefined;
}

export interface XMLDiagnostic {
  element?: XMLPositional;
  message: string;
  type?: ErrorType;
}

export interface ValidationError extends XMLRange {
  message: string;
  type: ErrorType;
}

export interface AttributeValidationError {
  message: string;
  type: ErrorType;

  /**
   * Start position within the value.
   */
  start: number;

  /**
   * End position within the value.
   */
  end: number;
}

// Wrapper for e.getAttribute(key) which defaults to null instead of empty string under Node
export function getAttribute(elem: XMLElement, key: string): string | null {
  const value = elem.getAttribute(key);
  if (value == '') {
    // Special case for xmldom
    return elem.hasAttribute(key) ? value : null;
  } else {
    return value;
  }
}

function isRange(input: unknown): input is XMLRange {
  return (
    input != null &&
    typeof input == 'object' &&
    typeof (input as XMLRange).start == 'object' &&
    typeof (input as XMLRange).end == 'object'
  );
}

export type XMLPositional = XMLElement | AttributeNode | [XMLElement | AttributeNode, number, number] | XMLRange;

export function getPosition(input: XMLPositional | null | undefined): XMLRange {
  var position: XMLRange = {
    start: undefined,
    end: undefined
  };
  if (input == null) {
    return position;
  }

  if (isRange(input)) {
    return input;
  }

  let override;
  let startIndex;
  let endIndex;

  let node: XMLElement | AttributeNode;

  if (input instanceof Array) {
    // Manually specified positions
    startIndex = input[1];
    endIndex = input[2];
    override = true;
    node = input[0];
  } else {
    node = input;
  }

  var owner;
  if (isAttribute(node)) {
    owner = node.ownerElement.ownerDocument;
  } else {
    owner = node.ownerDocument;
  }
  var locator = owner ? owner.locator : null;
  if (locator) {
    if (override && startIndex != null && endIndex != null) {
      position.start = locator.position(startIndex);
      position.end = locator.position(endIndex);
    } else if (isElement(node) && node.openStart != null && node.nameEnd != null) {
      // This is an element
      position.start = locator.position(node.openStart + 1);
      position.end = locator.position(node.nameEnd);
    } else if (isAttribute(node)) {
      // This is an attribute
      var attrPosition =
        node.ownerElement.attributePositions == null ? null : node.ownerElement.attributePositions[node.name];
      if (attrPosition != null && attrPosition.valueStart != null && attrPosition.end != null) {
        if (attrPosition.end - attrPosition.valueStart > 2) {
          // Exclude quotes
          position.start = locator.position(attrPosition.valueStart + 1);
          position.end = locator.position(attrPosition.end - 1);
        } else {
          // Empty value - include quotes
          position.start = locator.position(attrPosition.valueStart);
          position.end = locator.position(attrPosition.end);
        }
      }
    }
  }

  return position;
}

function attributeNamePosition(element: XMLElement, attributeName: string): XMLRange {
  var owner = element.ownerDocument;
  var locator = owner ? owner.locator : null;
  if (locator) {
    if (element.attributePositions != null && element.attributePositions.hasOwnProperty(attributeName)) {
      var p = element.attributePositions[attributeName];
      return {
        start: locator.position(p.start),
        end: locator.position(p.nameEnd)
      };
    } else {
      return getPosition(element);
    }
  } else {
    return { start: null, end: null };
  }
}

export function attributeValuePosition(
  element: XMLElement,
  attributeName: string,
  start: number,
  end: number
): XMLRange {
  var owner = element.ownerDocument;
  var locator = owner ? owner.locator : null;
  if (locator) {
    if (element.attributePositions != null && element.attributePositions.hasOwnProperty(attributeName)) {
      var p = element.attributePositions[attributeName];
      if (start == end) {
        end += 1;
      }
      return {
        start: locator.position(p.valueStart + 1 + start),
        end: locator.position(p.valueStart + 1 + end)
      };
    } else {
      return getPosition(element);
    }
  } else {
    return {
      start: null,
      end: null
    };
  }
}

export function elementTextPosition(element: XMLElement, start: number, end: number): XMLRange {
  var owner = element.ownerDocument;
  var locator = owner ? owner.locator : null;
  if (locator) {
    if (element.openEnd != null) {
      if (start == end) {
        end += 1;
      }
      return {
        start: locator.position(element.openEnd + start),
        end: locator.position(element.openEnd + end)
      };
    }
  }
  return { start: null, end: null };
}

// Chrome's attribute node doesn't contain the ownerElement anymore.
// We use this as an alternative.
// We still need to check whether or not the attribute actually exists.
export function attributeNode(element: XMLElement, attributeName: string): AttributeNode | null {
  if (element.getAttributeNode(attributeName)) {
    return {
      ownerElement: element,
      name: attributeName,
      get value() {
        return element.getAttribute(attributeName)!;
      }
    };
  } else {
    return null;
  }
}

export type ErrorType = 'warning' | 'error';
// element can be one of:
//  * an Element node
//  * an Attribute node
//  * an array with [start, end] positions (character indices)
// type can be one of:
//  * 'error'
//  * 'warning'
export function error(element: XMLPositional | null | undefined, message: string, type?: ErrorType): ValidationError {
  const position = getPosition(element);

  return {
    message,
    type: type || 'error',
    start: position.start,
    end: position.end
  };
}

export function warning(element: XMLPositional, message: string): ValidationError {
  return error(element, message, 'warning');
}

// Given an Element, and a hash of definitions, parse the element.
export function parseElement(element: XMLElement, definitions: any) {
  // TODO: this should return a parsed / normalized version
  var tag = element.tagName;
  var type: { [key: string]: any } = definitions[tag];

  var result = {
    type: tag as string | null,
    attributes: {} as { [key: string]: any },
    errors: [] as any[]
  };

  // The specific tag exclusions if for the specs
  if (type == null && tag != 'context-menu' && tag != 'button') {
    result.type = null;
    result.errors.push(warning(element, "Invalid element '" + tag + "'"));
  } else {
    for (var i = 0; i < element.attributes.length; i++) {
      var attributeName = element.attributes[i];
      var attributeType = type[attributeName.name];
      if (attributeType === undefined && definitions.default) {
        attributeType = definitions.default[attributeName.name];
      }
      if (attributeType == null) {
        result.errors.push(
          warning(attributeNamePosition(element, attributeName.name), "Invalid attribute '" + attributeName.name + "'")
        );
      } else {
        if (attributeType.warning) {
          result.errors.push(warning(attributeNamePosition(element, attributeName.name), attributeType.warning));
        } else {
          try {
            var attributeValue = attributeType(attributeName.value, attributeName);
            result.attributes[attributeName.name] = attributeValue;
          } catch (err) {
            result.errors.push(error(attributeNode(element, attributeName.name), err.message));
          }
        }
      }
    }

    if (type._required) {
      type._required.forEach(function (name: string) {
        if (getAttribute(element, name) == null) {
          result.errors.push(error(element, name + ' is required'));
        }
      });
    }
  }

  return result;
}

export const attribute: { [key: string]: (...args: any[]) => any } = {};

attribute.any = function () {
  // Nothing to check
};

attribute.notBlank = function (value: string, element: AttributeNode) {
  if (value === '') {
    throw new Error(element.name + ' cannot be blank');
  }
  return value;
};

// TODO: validate the interpolation
attribute.label = attribute.any;

// TODO: validate that it is a valid id (alphanumeric?)
attribute.id = attribute.notBlank;

// TODO: validate that this is a valid path (and that it exists?)
attribute.path = attribute.any;

// Attribute, object or relationship name
attribute.name = function (value: string, element: AttributeNode) {
  if (/^[a-zA-Z][\w_]*$/.test(value)) {
    return value;
  } else {
    throw new Error('Not a valid name');
  }
};

attribute.optionList = function optionList(options: string[], customMessage?: string) {
  return function (value: string, element: AttributeNode) {
    if (options.indexOf(value) == -1) {
      var message = customMessage == null ? element.name + ' must be one of ' + options : customMessage;
      throw new Error(message);
    }
    return value;
  };
};

attribute.optionListWithFunctions = function optionListWithFunctions(
  options: string[],
  functionPrefix: string,
  customMessage?: string
) {
  return function (value: string, element: AttributeNode) {
    if (value.indexOf(functionPrefix) === 0) {
      // function token expression, therefore allow
      return value;
    }
    if (options.indexOf(value) == -1) {
      var message = customMessage == null ? element.name + ' must be one of ' + options : customMessage;
      throw new Error(message);
    }
    return value;
  };
};

attribute.multiOptionList = function multiOptionList(options: string[], customMessage?: string) {
  return function (valuesString: string, element: AttributeNode) {
    return validateMultiOptions(valuesString, element, options, customMessage);
  };
};

attribute.multiOptionListWithFunctions = function multiOptionList(
  options: string[],
  functionPrefix: string,
  customMessage?: string
) {
  return function (valuesString: string, element: AttributeNode) {
    if (valuesString.indexOf(functionPrefix) === 0) {
      // function token expression, therefore allow
      return valuesString;
    }
    return validateMultiOptions(valuesString, element, options, customMessage);
  };
};

function validateMultiOptions(valuesString: string, element: AttributeNode, options: string[], customMessage?: string) {
  var values = valuesString.split(',');
  var invalidValues: string[] = [];
  values.forEach((value) => {
    if (options.indexOf(value) == -1) {
      invalidValues.push(value);
    }
  });

  if (invalidValues.length === 0) {
    return valuesString;
  } else {
    var message = 'Invalid values: ' + invalidValues + '. ';
    var extraMessage = customMessage == null ? element.name + ' values must be from ' + options : customMessage;
    throw new Error(message + extraMessage);
  }
}

// filter can be an array of strings, or a comma-separated list
export function children(element: XMLElement, filter?: string[] | string): XMLElement[] {
  if (element == null) {
    return [];
  }
  var all = element.children || element.childNodes;
  if (all == null) {
    return [];
  }
  var filtered: XMLElement[] = [];
  var allowedNames = null;
  if (Array.isArray(filter)) {
    allowedNames = filter;
  } else if (typeof filter == 'string') {
    allowedNames = filter.split(',');
  }
  for (var i = 0; i < all.length; i++) {
    var child = all[i];
    if (
      isElement(child) &&
      child.tagName != null &&
      (allowedNames == null || allowedNames.indexOf(child.tagName) != -1)
    ) {
      filtered.push(child);
    }
  }
  return filtered;
}

export function validateChildren(element: XMLElement, tagNames: any, orderMessage?: string): ValidationError[] {
  var errors: ValidationError[] = [];
  var state = 0;
  Array.prototype.forEach.call(element.childNodes, function (child: Node) {
    if (isElement(child)) {
      var tag = child.tagName;
      var order = tagNames[tag];
      if (order == null) {
        errors.push(warning(child, "Invalid element '" + tag + "'"));
      } else if (order < state) {
        errors.push(error(child, orderMessage ?? 'Invalid element order'));
      } else {
        state = order;
      }
    } else if (child.nodeType == TEXT_NODE) {
      // Unfortunately we don't having position info for text nodes
      if ((child.textContent ?? '').trim().length > 0) {
        errors.push(warning(element, 'Text is not allowed inside this element'));
      }
    }
  });
  return errors;
}

export function getParser(): ConfiguredParser {
  if (configuredParser == null || configuredParser.implementation == null) {
    throw new Error('No DOMParser configured');
  }

  return configuredParser;
}

function loadDefaultParser() {
  if (typeof document != 'undefined' && typeof document.implementation != 'undefined') {
    configureParser({
      //@ts-ignore
      implementation: document.implementation as DOMImplementation,
      //@ts-ignore
      parser: new DOMParser() as XMLDOMParser,
      serializer: new XMLSerializer()
    });
  }
}

loadDefaultParser();

export function configureParser(options: ConfiguredParser) {
  configuredParser = options;
}

// This will use domparser if available, or the built-in browser parser if not.
export function parse(text: string): XMLDocument {
  const { parser } = getParser();
  return parser.parseFromString(text, 'text/xml');
}

export function createDocument(rootTag: string): XMLDocument {
  const { implementation } = getParser();
  return implementation.createDocument(null, rootTag, null);
}

export function documentToText(document: XMLDocument): string {
  const { serializer } = getParser();
  var xmlString = serializer.serializeToString(document);
  if (xmlString.indexOf('<?xml') !== 0) {
    xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
  }
  return xmlString;
}

export function childNode(element: XMLElement, childName: string): XMLElement | null {
  for (var i = 0; i < element.childNodes.length; i++) {
    var child = element.childNodes[i];
    if (isElement(child) && child.tagName == childName) {
      return child;
    }
  }
  return null;
}

export function childContent(element: XMLElement, childName: string): string | null {
  var child = childNode(element, childName);
  if (child != null) {
    return child.textContent;
  }
  return null;
}
