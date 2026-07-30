import { describe, it, expect, vi } from 'vitest';
import { Parser } from '../../lib/ltx/Parser.js';
import { XMPPElement } from '../../lib/ltx/Element.js';

describe('Parser (Integration with LtxParser)', () => {
  it('应该正确解析一个简单的自闭合元素', () => {
    return new Promise<void>((resolve) => {
      const xml = '<message type="chat"/>';
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        expect(tree).toBeInstanceOf(XMPPElement);
        expect(tree.tagName).toBe('message');
        expect(tree.getAttribute('type')).toBe('chat');
        expect(tree.childNodes).toHaveLength(0);
        resolve();
      });

      parser.write(xml);
      parser.end();
    });
  });

  it('应该正确解析一个带属性和文本内容的嵌套元素', () => {
    return new Promise<void>((resolve) => {
      const xml = '<iq id="123" type="get"><query xmlns="jabber:iq:roster">Hello World</query></iq>';
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        expect(tree.tagName).toBe('iq');
        expect(tree.getAttribute('id')).toBe('123');
        expect(tree.childNodes).toHaveLength(1);

        const query = tree.getChildren('query')[0];
        expect(query).toBeInstanceOf(XMPPElement);
        expect(query?.getAttribute('xmlns')).toBe('jabber:iq:roster');
        expect(query?.textContent).toBe('Hello World');

        resolve();
      });

      parser.write(xml);
      parser.end();
    });
  });

  it('应该正确处理 XML 实体转义', () => {
    return new Promise<void>((resolve) => {
      const xml = '<data>&lt;tag&gt; &amp; &quot;text&quot; &#39;more&#39;</data>';
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        expect(tree.tagName).toBe('data');
        expect(tree.textContent).toBe('<tag> & "text" \'more\'');
        resolve();
      });

      parser.write(xml);
      parser.end();
    });
  });

  it('应该正确处理 CDATA 块', () => {
    return new Promise<void>((resolve, reject) => {
      const xml = '<data><![CDATA[<raw> & "data" ]]></data>';
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        expect(tree.tagName).toBe('data');
        expect(tree.textContent).toBe('<raw> & "data" ');
        resolve();
      });

      parser.on('error', reject);

      parser.write(xml);
      parser.end();
    });
  });

  it('应该正确处理流式分块写入', () => {
    return new Promise<void>((resolve) => {
      const xmlPart1 = '<root><child>';
      const xmlPart2 = 'text</child></root>';
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        expect(tree.tagName).toBe('root');
        expect(tree.getChildren('child')[0]?.textContent).toBe('text');
        resolve();
      });

      parser.write(xmlPart1);
      parser.write(xmlPart2);
      parser.end();
    });
  });

  it('应该在文档不完整时触发 "Incomplete document" 错误', () => {
    return new Promise<void>((resolve) => {
      const xml = '<root><child>';
      const parser = new Parser();

      parser.on('error', (e: Error) => {
        expect(e.message).toBe('Incomplete document');
        resolve();
      });

      parser.write(xml);
      parser.end();
    });
  });

  it('应该在结束标签不匹配时触发 Mismatched end tag 错误', () => {
    return new Promise<void>((resolve) => {
      const xml = '<root></wrong>';
      const parser = new Parser();

      parser.on('error', (e: Error) => {
        expect(e.message).toContain('Mismatched end tag: expected root, got wrong');
        resolve();
      });

      parser.write(xml);
      parser.end();
    });
  });

  it('应该正确解析<?xml ...?> 声明', () => {
    return new Promise<void>((resolve) => {
      const xml = "<?xml version='1.0'?><stream:stream xml:lang='en' id='4178f07f-81ab-4e6f-9d60-21f6af6b797a' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' from='jabber.fr' version='1.0'><stream:features><authentication xmlns='urn:xmpp:sasl:2'><mechanism>SCRAM-SHA-1-PLUS</mechanism><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-1</mechanism><mechanism>OAUTHBEARER</mechanism><inline><bind xmlns='urn:xmpp:bind:0'><inline><feature var='urn:xmpp:carbons:2'/><feature var='urn:xmpp:csi:0'/><feature var='urn:xmpp:sm:3'/></inline></bind><sm xmlns='urn:xmpp:sm:3'/></inline></authentication><register xmlns='http://jabber.org/features/iq-register'/><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>SCRAM-SHA-1-PLUS</mechanism><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-1</mechanism><mechanism>OAUTHBEARER</mechanism></mechanisms><sasl-channel-binding xmlns='urn:xmpp:sasl-cb:0'><channel-binding type='tls-exporter'/></sasl-channel-binding><register xmlns='urn:xmpp:invite'/><register xmlns='urn:xmpp:ibr-token:0'/><limits xmlns='urn:xmpp:stream-limits:0'><max-bytes>262144</max-bytes><idle-seconds>840</idle-seconds></limits></stream:features>";
      const parser = new Parser();

      parser.on('tree', (tree: XMPPElement) => {
        // console.log(tree);
        expect(tree.tagName).toBe('stream:features');
        resolve();
      });

      parser.write(xml);
      // parser.end();
    });
  });

  it('应该能正确解析challenge', () => {
    return new Promise<void>((resolve) => {
      const xml = "<?xml version='1.0'?><stream:stream xml:lang='en' id='fbd8c9fd-440e-463e-b7d6-8197076ba506' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' from='jabber.fr' version='1.0'><stream:features><authentication xmlns='urn:xmpp:sasl:2'><mechanism>SCRAM-SHA-1-PLUS</mechanism><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-1</mechanism><mechanism>OAUTHBEARER</mechanism><inline><bind xmlns='urn:xmpp:bind:0'><inline><feature var='urn:xmpp:carbons:2'/><feature var='urn:xmpp:csi:0'/><feature var='urn:xmpp:sm:3'/></inline></bind><sm xmlns='urn:xmpp:sm:3'/></inline></authentication><register xmlns='http://jabber.org/features/iq-register'/><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>SCRAM-SHA-1-PLUS</mechanism><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-1</mechanism><mechanism>OAUTHBEARER</mechanism></mechanisms><sasl-channel-binding xmlns='urn:xmpp:sasl-cb:0'><channel-binding type='tls-exporter'/></sasl-channel-binding><register xmlns='urn:xmpp:invite'/><register xmlns='urn:xmpp:ibr-token:0'/><limits xmlns='urn:xmpp:stream-limits:0'><max-bytes>262144</max-bytes><idle-seconds>840</idle-seconds></limits></stream:features><challenge xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>cj1sdll0LzRvaVZFYWozZVJUd3JSd3B3PT1hYjJjNjMzZS03OTY5LTQ1NWMtOGRiMS1kNzA3YmRlZjQwMzcscz1ZV0psTVRoaE9XWXRPVEUwWmkwME4yRTJMV0l5TkdFdE1qQXdPRE0xWkRCalpUbGssaT0xMDAwMA==</challenge>";
      const parser = new Parser();
      let step = 0;
      parser.on('tree', (tree: XMPPElement) => {
        if (step === 0) {
          // 第一次触发的是 stream:features
          expect(tree.tagName).toBe('stream:features');
          step++;
          return;
        }
        expect(tree.tagName).toBe('challenge');
        expect(tree.getAttribute('xmlns')).toBe('urn:ietf:params:xml:ns:xmpp-sasl');
        resolve();
      });

      parser.write(xml);
      // parser.end();
    });
  });
});