import { describe, it, expect } from "vitest";
import { MessageReceips } from "../../../lib/plugins/xep0184/messageReceips";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0184: Message Delivery Receipts
 * @see https://xmpp.org/extensions/xep-0184.html
 * @version 1.2.0 (2022-03-28)
 *
 * 根据 XEP-0184 规范，消息回执使用以下元素:
 * - <request xmlns='urn:xmpp:receipts'/> : 请求回执
 * - <received xmlns='urn:xmpp:receipts' id='...'/> : 发送回执
 */
describe("MessageReceips", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(MessageReceips.NS).toBe("urn:xmpp:receipts");
    });
  });

  describe("createReceiptsEl", () => {
    it("should create a request element", () => {
      const el = MessageReceips.createReceiptsEl("request");
      expect(el.tagName).toBe("request");
      expect(el.namespaceURI).toBe(MessageReceips.NS);
    });

    it("should create a received element with id", () => {
      const el = MessageReceips.createReceiptsEl("received", "msg-123");
      expect(el.tagName).toBe("received");
      expect(el.namespaceURI).toBe(MessageReceips.NS);
      expect(el.getAttribute("id")).toBe("msg-123");
    });

    it("should throw when creating received element without id", () => {
      expect(() =>
        (MessageReceips.createReceiptsEl as any)("received")
      ).toThrow("回执请求需要提供消息ID");
    });
  });

  describe("parseReceipts", () => {
    it("should parse a request element", () => {
      const el = XMPPElement.createElementNS(MessageReceips.NS, "request");
      const result = MessageReceips.parseReceipts(el);
      expect(result.receipts.type).toBe("request");
      expect(result.receipts.id).toBeNull();
    });

    it("should parse a received element with id", () => {
      const el = XMPPElement.createElementNS(MessageReceips.NS, "received");
      el.setAttribute("id", "msg-456");
      const result = MessageReceips.parseReceipts(el);
      expect(result.receipts.type).toBe("received");
      expect(result.receipts.id).toBe("msg-456");
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "request");
      expect(() => MessageReceips.parseReceipts(el)).toThrow(
        "不是消息回执命名空间"
      );
    });
  });
});
