import { describe, it, expect } from "vitest";
import { Delay } from "../../../lib/plugins/xep0203/delay";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0203: Delayed Delivery
 * @see https://xmpp.org/extensions/xep-0203.html
 * @version 2.1.0 (2024-07-15)
 *
 * 根据 XEP-0203 规范，delay 元素用于指示消息在原始发送后经过了一段时间才被投递。
 * 元素包含:
 *   - stamp: 必填，原始时间戳 (CCYY-MM-DDThh:mm:ssZ)
 *   - from: 必填，原始发送者的 JID
 *   - 文本内容: 可选，延迟原因
 */
describe("Delay", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Delay.NS).toBe("urn:xmpp:delay");
    });
  });

  describe("createDelayEl", () => {
    it("should create a delay element with stamp, from and reason", () => {
      const stamp = new Date(2025, 6, 18, 14, 30, 0);
      const el = Delay.createDelayEl(stamp, "romeo@example.net", "Offline storage");

      expect(el.tagName).toBe("delay");
      expect(el.namespaceURI).toBe(Delay.NS);
      expect(el.getAttribute("stamp")).toMatch(/^2025-07-18T14:30:00/);
      expect(el.getAttribute("from")).toBe("romeo@example.net");
      expect(el.textContent).toBe("Offline storage");
    });

    it("should handle different dates in stamp", () => {
      const stamp = new Date(2025, 0, 1, 0, 0, 0);
      const el = Delay.createDelayEl(stamp, "juliet@example.net", "Not available");

      expect(el.getAttribute("stamp")).toMatch(/^2025-01-01T00:00:00/);
    });
  });

  describe("parseDelayEl", () => {
    it("should parse a delay element from XML string", () => {
      const xml = Parser.parse(
        `<delay xmlns='urn:xmpp:delay' stamp='2025-07-18T14:30:00Z' from='romeo@example.net'>Offline storage</delay>`
      );
      const result = Delay.parseDelayEl(xml);
      expect(result.delay.from).toBe("romeo@example.net");
      expect(result.delay.reason).toBe("Offline storage");
      expect(result.delay.stamp).toBeInstanceOf(Date);
    });

    it("should find delay element as child when wrapper element provided", () => {
      const xml = Parser.parse(`
        <message from='romeo@example.net' to='juliet@example.net' type='chat'>
          <body>Hello</body>
          <delay xmlns='urn:xmpp:delay' stamp='2025-07-18T14:30:00Z' from='romeo@example.net'/>
        </message>
      `);
      const result = Delay.parseDelayEl(xml);
      expect(result.delay.from).toBe("romeo@example.net");
      expect(result.delay.stamp).toBeInstanceOf(Date);
    });

    it("should handle empty reason text", () => {
      const xml = Parser.parse(
        `<delay xmlns='urn:xmpp:delay' stamp='2025-07-18T14:30:00Z' from='romeo@example.net'></delay>`
      );
      const result = Delay.parseDelayEl(xml);
      expect(result.delay.reason).toBe("");
    });

    it("should throw when no delay element found", () => {
      const el = XMPPElement.createElement("message");
      expect(() => Delay.parseDelayEl(el)).toThrow("未找到 delay 标签");
    });
  });
});
