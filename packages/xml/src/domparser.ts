// By importing this file, @journeyapps/domparser will be used instead of the browser's parser.
// Do not add this to default/index.ts - it must be imported explicitly.

import xmldom from 'xmldom';
import { configureParser } from './xml.js';
import { DOMParser, DOMImplementation } from '@journeyapps/domparser';

if (typeof document != 'undefined') {
  // Browser - use the native DOMImplementation for DOM nodes,
  // and @journeyapps/domparser for parsing.
  //@ts-ignore
  const implementation = document.implementation as DOMImplementation;
  const parser = new DOMParser({ implementation });
  const serializer = new XMLSerializer();

  configureParser({
    implementation,
    parser,
    serializer
  });
} else {
  // Web worker or NodeJS - use xmldom for DOM nodes,
  // and @journeyapps/domparser for parsing.
  // xmldom has some limitations, e.g. no `Element#children` property.

  const implementation = new xmldom.DOMImplementation();
  const parser = new DOMParser({ implementation });
  const serializer = new xmldom.XMLSerializer();

  configureParser({
    implementation,
    parser,
    serializer
  });
}
