import * as xml from '../src';
import { OrderedIncrementalUpdater } from '../src';
import { XMLElement } from '@journeyapps/domparser/types';
import { describe, it, expect } from 'vitest';

describe('OrderedIncrementalUpdater', function () {
  function parse(text: string) {
    return xml.parse(text);
  }

  function toString(element: XMLElement) {
    return xml.getParser().serializer.serializeToString(element);
  }

  it('should work without a source', function () {
    const diff = new OrderedIncrementalUpdater(null, ['test-child']);
    diff.append(null, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('id', 'one');
      }
    });
    diff.append(null, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('id', 'two');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(`<test-container><test-child id="one"/><test-child id="two"/></test-container>`);
  });

  it('should merge with a source', function () {
    const sourceDoc = parse(
      `<test-container><!-- comment 1 --><test-child id="one" /><!-- comment 2 --><test-child id="two" /></test-container>`
    );
    const diff = new OrderedIncrementalUpdater(sourceDoc.documentElement, ['test-child']);
    diff.append(sourceDoc.getElementById('one') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'one');
      }
    });
    diff.append(sourceDoc.getElementById('two') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'two');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(
      `<test-container><!-- comment 1 --><test-child id="one" updated="one"/><!-- comment 2 --><test-child id="two" updated="two"/></test-container>`
    );
  });

  it('should use data order', function () {
    const sourceDoc = parse(
      `<test-container><!-- comment 1 --><test-child id="one" /><!-- comment 2 --><test-child id="two" /></test-container>`
    );
    const diff = new OrderedIncrementalUpdater(sourceDoc.documentElement, ['test-child']);
    diff.append(sourceDoc.getElementById('two') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'two');
      }
    });
    diff.append(sourceDoc.getElementById('one') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'one');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(
      `<test-container><!-- comment 2 --><test-child id="two" updated="two"/><!-- comment 1 --><test-child id="one" updated="one"/></test-container>`
    );
  });

  it('should handle new and removed elements', function () {
    const sourceDoc = parse(
      `<test-container><!-- comment 1 --><test-child id="one" /><!-- comment 2 --><test-child id="two" /></test-container>`
    );
    const diff = new OrderedIncrementalUpdater(sourceDoc.documentElement, ['test-child']);
    diff.append(sourceDoc.getElementById('two') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'two');
      }
    });
    diff.append(null, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'three');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(
      `<test-container><!-- comment 1 --><!-- comment 2 --><test-child id="two" updated="two"/><test-child updated="three"/></test-container>`
    );
  });

  it('should handle new elements at the beginning of the element', function () {
    const sourceDoc = parse(
      `<test-container><!-- comment 1 --><test-child id="one" /><!-- comment 2 --><test-child id="two" /></test-container>`
    );
    const diff = new OrderedIncrementalUpdater(sourceDoc.documentElement, ['test-child']);
    diff.append(null, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'zero');
      }
    });
    diff.append(sourceDoc.getElementById('two') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'two');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(
      `<test-container><test-child updated="zero"/><!-- comment 1 --><!-- comment 2 --><test-child id="two" updated="two"/></test-container>`
    );
  });

  it('should keep unknown elements', function () {
    const sourceDoc = parse(
      `<test-container><unknown><with-nested/></unknown>Text<!-- comment --><test-child id="one" /></test-container>`
    );
    const diff = new OrderedIncrementalUpdater(sourceDoc.documentElement, ['test-child']);
    diff.append(sourceDoc.getElementById('one') as any, {
      tagName: 'test-child',
      update(element) {
        element.setAttribute('updated', 'one');
      }
    });

    const doc = xml.createDocument('test-doc');
    const element = doc.createElement('test-container');
    diff.update(element);

    expect(toString(element)).toEqual(
      `<test-container><unknown><with-nested/></unknown>Text<!-- comment --><test-child id="one" updated="one"/></test-container>`
    );
  });
});
