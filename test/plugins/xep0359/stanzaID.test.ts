import { describe, it, expect } from "vitest";
import { StanzaID } from "../../../lib/plugins/xep0359/stanzaID";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0359: Unique and Stable Stanza IDs
 * @see https://xmpp.org/extensions/xep-0359.html
 * @version 0.8.0 (2025-02-24)
 *
 * 根据 XEP-0359 规范，有三种元素:
 * - <stanza-id/>: 服务器分配给消息的唯一稳定 ID
 * - <origin-id/>: 发送方分配给消息的唯一 ID
 * - <referenced-stanza/>: 引用的 Stanza 的 ID
 */
describe("StanzaID", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(StanzaID.NS).toBe("urn:xmpp:sid:0");
    });
  });

  describe("parseStanzaId", () => {
    it("should parse a stanza-id element", () => {
      const el = XMPPElement.createElementNS(StanzaID.NS, "stanza-id");
      el.setAttribute("id", "stanza-123");
      el.setAttribute("by", "example.org");
      const result = StanzaID.parseStanzaId(el);
      expect(result.stanzaID.id).toBe("stanza-123");
      expect(result.stanzaID.by).toBe("example.org");
    });

    it("should parse an origin-id element", () => {
      const el = XMPPElement.createElementNS(StanzaID.NS, "origin-id");
      el.setAttribute("id", "origin-456");
      const result = StanzaID.parseStanzaId(el);
      expect(result.originID.id).toBe("origin-456");
      expect(result.originID.by).toBeUndefined();
    });

    it("should parse a referenced-stanza element", () => {
      const el = XMPPElement.createElementNS(StanzaID.NS, "referenced-stanza");
      el.setAttribute("id", "ref-789");
      el.setAttribute("by", "juliet@example.net");
      const result = StanzaID.parseStanzaId(el);
      expect(result.referencedStanza.id).toBe("ref-789");
      expect(result.referencedStanza.by).toBe("juliet@example.net");
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "stanza-id");
      el.setAttribute("id", "test-1");
      expect(() => StanzaID.parseStanzaId(el)).toThrow(
        "不是stanzaId命名空间"
      );
    });

    it("should handle by attribute as optional", () => {
      const el = XMPPElement.createElementNS(StanzaID.NS, "origin-id");
      el.setAttribute("id", "origin-no-by");
      const result = StanzaID.parseStanzaId(el);
      expect(result.originID.id).toBe("origin-no-by");
      expect(result.originID.by).toBeUndefined();
    });
  });

  describe("XEP-0359 examples", () => {
    it("should match Example 1: Server-assigned ID", () => {
      // <stanza-id xmlns='urn:xmpp:sid:0' id='6b06e6b5-bb1e-4e34-b7b5-91cd1c24cd30' by='example.org'/>
      const el = XMPPElement.createElementNS(StanzaID.NS, "stanza-id");
      el.setAttribute("id", "6b06e6b5-bb1e-4e34-b7b5-91cd1c24cd30");
      el.setAttribute("by", "example.org");
      const result = StanzaID.parseStanzaId(el);
      expect(result.stanzaID.id).toBe("6b06e6b5-bb1e-4e34-b7b5-91cd1c24cd30");
      expect(result.stanzaID.by).toBe("example.org");
    });

    it("should match Example 2: Origin ID", () => {
      // <origin-id xmlns='urn:xmpp:sid:0' id='c96ee1ca-cea1-4aca-8bcb-4ebc7e72c93e'/>
      const el = XMPPElement.createElementNS(StanzaID.NS, "origin-id");
      el.setAttribute("id", "c96ee1ca-cea1-4aca-8bcb-4ebc7e72c93e");
      const result = StanzaID.parseStanzaId(el);
      expect(result.originID.id).toBe("c96ee1ca-cea1-4aca-8bcb-4ebc7e72c93e");
    });
  });
});
