import * as xml from '../src';
import { XMLPositional, parse } from '../src';
import { XMLElement } from '@journeyapps/domparser/types';
import { describe, it, expect, beforeEach } from 'vitest';

declare module 'vitest' {
  export interface TestContext {
    skipErrorPositions: boolean;
  }
}

describe('xml parsing', () => {
  beforeEach((context) => {
    context.skipErrorPositions = true;
  });

  // Error building
  it('should build an error from an element', ({ skipErrorPositions }) => {
    const doc = parse('<test>\n<b/>\n</test>');
    const element = doc.getElementsByTagName('b')[0];
    const error = xml.error(element, 'Err');
    expect(error.message).toBe('Err');
    if (!skipErrorPositions) {
      expect(error.start).toEqual({ line: 1, column: 1 });
      expect(error.end).toEqual({ line: 1, column: 2 });
    }
    expect(error.type).toBe('error');
  });

  it('should be graceful when no locator is available', () => {
    const error = xml.error({} as XMLPositional, 'Err');
    expect(error.message).toBe('Err');
    expect(error.start).toBe(undefined);
    expect(error.end).toBe(undefined);
    expect(error.type).toBe('error');
  });

  it('should build a warning', ({ skipErrorPositions }) => {
    const doc = parse('<test>\n<b/>\n</test>');
    const error = xml.warning(doc.getElementsByTagName('b')[0], 'First warning');
    expect(error.message).toBe('First warning');
    if (!skipErrorPositions) {
      expect(error.start).toEqual({ line: 1, column: 1 });
      expect(error.end).toEqual({ line: 1, column: 2 });
    }
    expect(error.type).toBe('warning');
  });

  it('should get the position from an attribute', ({ skipErrorPositions }) => {
    const doc = parse("<test>\n<b tag='red'/>\n</test>");
    const attributeNode = {
      ownerElement: doc.getElementsByTagName('b')[0],
      name: 'tag',
      value: 'red'
    };
    const position = xml.getPosition(attributeNode);

    if (!skipErrorPositions) {
      expect(position.start).toEqual({ line: 1, column: 8 });
      expect(position.end).toEqual({ line: 1, column: 11 });
    }
  });

  it('should get the position from a manual position', ({ skipErrorPositions }) => {
    const doc = parse("<test>\n<b tag='red'/>\n</test>");
    const position = xml.getPosition([doc.documentElement, 15, 18]);
    if (!skipErrorPositions) {
      expect(position.start).toEqual({ line: 1, column: 8 });
      expect(position.end).toEqual({ line: 1, column: 11 });
    }
  });

  // Attribute validation

  it('should validate that an attribute is not blank', () => {
    expect(xml.attribute.notBlank('something')).toBe('something');

    expect(() => {
      return xml.attribute.notBlank('', { name: 'test' });
    }).toThrowError('test cannot be blank');
  });

  it('should validate names', () => {
    expect(xml.attribute.name('test')).toBe('test');
    expect(xml.attribute.name('SOME_thing123')).toBe('SOME_thing123');

    expect(function () {
      return xml.attribute.name('');
    }).toThrowError('Not a valid name');

    expect(function () {
      return xml.attribute.name('test ');
    }).toThrowError('Not a valid name');

    expect(function () {
      return xml.attribute.name('1test');
    }).toThrowError('Not a valid name');

    expect(function () {
      return xml.attribute.name('my test');
    }).toThrowError('Not a valid name');

    expect(function () {
      return xml.attribute.name('_test');
    }).toThrowError('Not a valid name');
  });

  it('should validate that an attribute is part of a specified options list', () => {
    const req = xml.attribute.optionList(['red', 'green', 'blue']);
    expect(function () {
      return req('yellow', { name: 'test' });
    }).toThrowError('test must be one of red,green,blue');

    expect(req('red')).toBe('red');
  });

  it('should validate that an attribute value list contains only options from of a specified options list', () => {
    const req = xml.attribute.multiOptionList(['red', 'green', 'blue']);
    expect(function () {
      return req('yellow', { name: 'test' });
    }).toThrowError('Invalid values: yellow. test values must be from red,green,blue');

    expect(function () {
      return req('yellow,blue', { name: 'test' });
    }).toThrowError('Invalid values: yellow. test values must be from red,green,blue');

    expect(req('red,blue')).toBe('red,blue');
  });

  // Element parsing
  function intAttribute(value, element) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(element.name + ' is not a valid number');
    }
    return num;
  }

  it('should parse attributes of a valid element', () => {
    const doc = parse("<test tag='red'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {
      test: { tag: xml.attribute.notBlank }
    });
    expect(parsed).toEqual({
      type: 'test',
      attributes: { tag: 'red' },
      errors: []
    });
  });

  it('should should use the parsed version of an attribute', () => {
    const doc = parse("<test count='42'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {
      test: { count: intAttribute }
    });
    expect(parsed).toEqual({
      type: 'test',
      attributes: { count: 42 },
      errors: []
    });
  });

  it('should should report an error on an invalid attribute', () => {
    const doc = parse("<test count='five'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {
      test: { count: intAttribute }
    });
    expect(parsed.type).toEqual('test');
    expect(parsed.attributes).toEqual({});
    expect(parsed.errors[0].message).toEqual('count is not a valid number');
    expect(parsed.errors[0].type).toEqual('error');
  });

  it('should report a warning on an undefined attribute', ({ skipErrorPositions }) => {
    const doc = parse("<test count='five'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {
      test: {}
    });
    expect(parsed.type).toEqual('test');
    expect(parsed.attributes).toEqual({});

    const expectedItem = {
      message: "Invalid attribute 'count'",
      type: 'warning',
      start: skipErrorPositions ? null : { line: 0, column: 6 },
      end: skipErrorPositions ? null : { line: 0, column: 11 }
    };

    expect(parsed).toEqual({
      type: 'test',
      attributes: {},
      errors: expect.arrayContaining([expectedItem])
    });
  });

  it('should use default attributes', () => {
    const doc = parse("<test count='42'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {
      default: { count: intAttribute },
      test: {}
    });
    expect(parsed).toEqual({
      type: 'test',
      attributes: { count: 42 },
      errors: []
    });
  });

  it('should report a warning for undefined elements', () => {
    const doc = parse("<test count='five'/>");
    const parsed = xml.parseElement(doc.childNodes[0] as XMLElement, {});
    expect(parsed.type).toEqual(null);
    expect(parsed.attributes).toEqual({});
    expect(parsed.errors[0].message).toEqual("Invalid element 'test'");
    expect(parsed.errors[0].type).toEqual('warning');
  });
});
