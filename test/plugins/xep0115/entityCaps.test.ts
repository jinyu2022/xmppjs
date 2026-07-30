import { describe, it, expect } from "vitest";
import { EntityCaps } from "../../../lib/plugins/xep0115/entityCaps";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0115: Entity Capabilities
 * @see https://xmpp.org/extensions/xep-0115.html
 * @version 1.6.0 (2022-03-08)
 *
 * 根据 XEP-0115 规范，实体能力通过 caps 元素发布:
 * - node: 能力节点的URI
 * - ver: 验证字符串的哈希值
 * - hash: 使用的哈希算法
 */
describe("EntityCaps", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(EntityCaps.NS).toBe("http://jabber.org/protocol/caps");
    });
  });

  describe("parseCaps", () => {
    it("should parse a valid caps element", () => {
      const el = XMPPElement.createElementNS(EntityCaps.NS, "c");
      el.setAttribute("node", "http://example.com/myapp");
      el.setAttribute("ver", "1.2.3");
      el.setAttribute("hash", "sha-1");
      const result = EntityCaps.parseCaps(el);
      expect(result.cap.node).toBe("http://example.com/myapp");
      expect(result.cap.ver).toBe("1.2.3");
      expect(result.cap.hash).toBe("sha-1");
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "c");
      el.setAttribute("node", "http://example.com/myapp");
      el.setAttribute("ver", "1.0");
      el.setAttribute("hash", "sha-1");
      expect(() => EntityCaps.parseCaps(el)).toThrow("不是实体能力命名空间");
    });
  });

  describe("generateCapsVerification", () => {
    it("should generate verification string from identities and features", async () => {
      const identities = [
        { category: "client", type: "bot", name: "TestBot" },
      ];
      const features = [
        "http://jabber.org/protocol/disco#info",
        "urn:xmpp:ping",
      ];
      const result = await EntityCaps.generateCapsVerification(
        identities,
        features
      );
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should produce consistent output for same inputs", async () => {
      const identities = [
        { category: "client", type: "pc", name: "Mercury" },
      ];
      const features = [
        "http://jabber.org/protocol/caps",
        "http://jabber.org/protocol/disco#info",
      ];
      const r1 = await EntityCaps.generateCapsVerification(identities, features);
      const r2 = await EntityCaps.generateCapsVerification(identities, features);
      expect(r1).toBe(r2);
    });

    it("should sort identities by category, type, lang, name", async () => {
      const identities = [
        { category: "server", type: "im" },
        { category: "client", type: "pc", name: "Alpha" },
        { category: "client", type: "bot" },
      ];
      const features: string[] = [];
      // Should not throw
      const result = await EntityCaps.generateCapsVerification(
        identities,
        features
      );
      expect(result).toBeTruthy();
    });

    it("should handle dataForm in verification", async () => {
      const identities = [
        { category: "client", type: "pc", name: "Test" },
      ];
      const features = ["http://jabber.org/protocol/caps"];
      const dataForm = {
        type: "result" as const,
        fields: [
          { var: "FORM_TYPE", type: "hidden" as const, values: ["urn:xmpp:dataforms:software"], required: false, label: undefined, desc: undefined, options: undefined },
          { var: "ip_version", type: "list-single" as const, values: ["ipv4", "ipv6"], required: false, label: undefined, desc: undefined, options: undefined },
          { var: "os", type: "text-single" as const, values: ["Linux"], required: false, label: undefined, desc: undefined, options: undefined },
        ],
      };
      const result = await EntityCaps.generateCapsVerification(
        identities,
        features,
        dataForm
      );
      expect(typeof result).toBe("string");
    });
  });

  describe("createCapsElement", () => {
    it("should create a caps element with node, ver and hash", () => {
      const caps = { node: "http://example.com/myapp", ver: "1.0", hash: "sha-1" };
      const el = EntityCaps.createCapsElement(caps);
      expect(el.tagName).toBe("c");
      expect(el.namespaceURI).toBe(EntityCaps.NS);
      expect(el.getAttribute("node")).toBe("http://example.com/myapp");
      expect(el.getAttribute("ver")).toBe("1.0");
      expect(el.getAttribute("hash")).toBe("sha-1");
    });

    it("should create element from parsed caps", () => {
      const orig = XMPPElement.createElementNS(EntityCaps.NS, "c");
      orig.setAttribute("node", "http://example.com/app");
      orig.setAttribute("ver", "2.0");
      orig.setAttribute("hash", "sha-1");
      const parsed = EntityCaps.parseCaps(orig);
      const el = EntityCaps.createCapsElement(parsed.cap);
      expect(el.getAttribute("node")).toBe("http://example.com/app");
      expect(el.getAttribute("ver")).toBe("2.0");
      expect(el.getAttribute("hash")).toBe("sha-1");
    });
  });
});
