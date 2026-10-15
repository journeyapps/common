import { prettyText } from '../src';
import * as xml from '../src';
import { describe, it, expect } from 'vitest';

const SAMPLE_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<test-doc xmlns:one="ns1">
<no-whitespace-here /><another-element>On the same line</another-element>

 <!--A comment -->
   <element with-attribute = "true"/>
   <one:ns attr="here" one:attr2="also"/>



   <!-- multiple newlines before -->
   <text>  Text surrounded by whitespace  </text>
   <nested><element><child>Test</child></element></nested>

   <text>
   Newline inside element
 </text>
   <blank-element></blank-element>
   <with-space> </with-space>

    text mixed with children
    <other />

    <![CDATA[ a cdata <test> ]]>
    more text mixed with children &lt;&gt;
</test-doc>`;

const EXPECTED_OUTPUT = `<?xml version="1.0" encoding="UTF-8"?>
<test-doc xmlns:one="ns1">
    <no-whitespace-here />
    <another-element>On the same line</another-element>

    <!--A comment -->
    <element with-attribute="true" />
    <one:ns attr="here" one:attr2="also" />


    <!-- multiple newlines before -->
    <text>  Text surrounded by whitespace  </text>
    <nested>
        <element>
            <child>Test</child>
        </element>
    </nested>

    <text>
   Newline inside element
 </text>
    <blank-element />
    <with-space />

    text mixed with children
    <other />

    <![CDATA[ a cdata <test> ]]>
    more text mixed with children &lt;>
</test-doc>
`;

describe('pretty', function () {
  function parse(text: string) {
    return xml.parse(text);
  }

  it('should pretty-print a doc', function () {
    const doc = parse(SAMPLE_DOC);
    const pretty = prettyText(doc);

    expect(pretty).toEqual(EXPECTED_OUTPUT);
  });
});
