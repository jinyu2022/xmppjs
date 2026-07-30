import { describe, it, expect } from "vitest";
import { Forward } from "../../../lib/plugins/XEP0297/forward";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0297: Stanza Forwarding
 * @see https://xmpp.org/extensions/xep-0297.html
 * @version 1.0.1 (2024-07-15)
 *
 * 根据 XEP-0297 规范，转发将完整的 stanza 包装在 <forwarded/> 元素中:
 * - <forwarded/> 包含一个延迟元素和转发的 stanza (message/presence/iq)
 * - 命名空间: urn:xmpp:forward:0
 */
describe("Forward", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Forward.NS).toBe("urn:xmpp:forward:0");
    });
  });

  describe("parseForwardedEl", () => {
    it("should parse a forwarded element containing a message", () => {
      const xml = Parser.parse(`
        <forwarded xmlns="urn:xmpp:forward:0">
          <message xmlns="jabber:client" from="romeo@example.net" to="juliet@example.net" type="chat">
            <body>Hello!</body>
          </message>
        </forwarded>
      `);
      const result = Forward.parseForwardedEl(xml);
      expect(result.forwarded.message).toBeDefined();
      expect(result.forwarded.message!.getAttribute("from")).toBe(
        "romeo@example.net"
      );
      expect(result.forwarded.delay).toBeUndefined();
    });

    it("should parse a forwarded element with delay", () => {
      const xml = Parser.parse(`
        <forwarded xmlns="urn:xmpp:forward:0">
          <delay xmlns="urn:xmpp:delay" stamp="2025-07-18T14:30:00Z" from="romeo@example.net"/>
          <message xmlns="jabber:client" from="romeo@example.net" to="juliet@example.net" type="chat">
            <body>Delayed message</body>
          </message>
        </forwarded>
      `);
      const result = Forward.parseForwardedEl(xml);
      expect(result.forwarded.message).toBeDefined();
      expect(result.forwarded.delay).toBeDefined();
      expect(result.forwarded.delay!.getAttribute("stamp")).toBe(
        "2025-07-18T14:30:00Z"
      );
    });

    it("should parse a forwarded element containing a presence", () => {
      const xml = Parser.parse(`
        <forwarded xmlns="urn:xmpp:forward:0">
          <presence xmlns="jabber:client" from="romeo@example.net" to="juliet@example.net">
            <show>away</show>
          </presence>
        </forwarded>
      `);
      const result = Forward.parseForwardedEl(xml);
      expect(result.forwarded.presence).toBeDefined();
      expect(result.forwarded.presence!.getAttribute("from")).toBe(
        "romeo@example.net"
      );
    });

    it("should parse a forwarded element containing an iq", () => {
      const xml = Parser.parse(`
        <forwarded xmlns="urn:xmpp:forward:0">
          <iq xmlns="jabber:client" from="example.org" to="romeo@example.net" type="result" id="iq-1"/>
        </forwarded>
      `);
      const result = Forward.parseForwardedEl(xml);
      expect(result.forwarded.iq).toBeDefined();
      expect(result.forwarded.iq!.getAttribute("type")).toBe("result");
    });

    it("should throw when no forwarded element found", () => {
      const el = XMPPElement.createElement("message");
      expect(() => Forward.parseForwardedEl(el)).toThrow("未找到forwarded标签");
    });

    it("should throw when forwarded contains multiple stanzas", () => {
      const xml = Parser.parse(`
        <forwarded xmlns="urn:xmpp:forward:0">
          <message xmlns="jabber:client" from="romeo@example.net" type="chat"/>
          <presence xmlns="jabber:client" from="juliet@example.net"/>
        </forwarded>
      `);
      expect(() => Forward.parseForwardedEl(xml)).toThrow(
        "forwarded包含多个message | presence | iq"
      );
    });

    it("should find forwarded as child element", () => {
      const xml = Parser.parse(`
        <message xmlns="jabber:client">
          <forwarded xmlns="urn:xmpp:forward:0">
            <message xmlns="jabber:client" from="romeo@example.net" type="chat">
              <body>Forwarded content</body>
            </message>
          </forwarded>
        </message>
      `);
      const result = Forward.parseForwardedEl(xml);
      expect(result.forwarded.message).toBeDefined();
      expect(
        result.forwarded.message!.getElementsByTagName("body")[0]?.textContent
      ).toBe("Forwarded content");
    });
  });
});
