import { describe, it, expect } from "vitest";
import { Correction } from "../../../lib/plugins/xep0308/correction";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0308: Last Message Correction
 * @see https://xmpp.org/extensions/xep-0308.html
 * @version 1.2.1 (2022-05-17)
 *
 * 根据 XEP-0308 规范，消息更正通过 <replace/> 元素实现:
 * - <replace/> 元素包含在消息中，指向被更正的原消息 ID
 * - 命名空间: urn:xmpp:message-correct:0
 * - corrected 消息仍包含原始 body，但语义上替换了原消息
 */
describe("Correction", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Correction.NS).toBe("urn:xmpp:message-correct:0");
    });
  });

  describe("createReplaceEl", () => {
    it("should create a replace element with id attribute", () => {
      const el = Correction.createReplaceEl("msg-123");
      expect(el.tagName).toBe("replace");
      expect(el.namespaceURI).toBe(Correction.NS);
      expect(el.getAttribute("id")).toBe("msg-123");
    });
  });

  describe("parseReplaceEl", () => {
    it("should parse a valid replace element", () => {
      const el = XMPPElement.createElementNS(Correction.NS, "replace");
      el.setAttribute("id", "msg-456");
      const result = Correction.parseReplaceEl(el);
      expect(result.replace.id).toBe("msg-456");
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "replace");
      el.setAttribute("id", "msg-789");
      expect(() => Correction.parseReplaceEl(el)).toThrow(
        "非法命名空间的消息更正元素"
      );
    });

    it("should throw when id attribute is missing", () => {
      const el = XMPPElement.createElementNS(Correction.NS, "replace");
      expect(() => Correction.parseReplaceEl(el)).toThrow(
        "消息更正元素缺少 id"
      );
    });
  });

  describe("createCorrectionMessageEl", () => {
    it("should create a chat message with body and replace child", () => {
      const msg = Correction.createCorrectionMessageEl(
        "juliet@example.net",
        "orig-1",
        "Corrected message"
      );
      expect(msg.tagName).toBe("message");
      expect(msg.getAttribute("to")).toBe("juliet@example.net");
      expect(msg.getAttribute("type")).toBe("chat");
      expect(msg.getElementsByTagName("body")[0]?.textContent).toBe(
        "Corrected message"
      );
      const replaceEl = msg.getElementsByTagName("replace")[0];
      expect(replaceEl).toBeDefined();
      expect(replaceEl!.getAttribute("id")).toBe("orig-1");
    });

    it("should create a groupchat message with replace element", () => {
      const msg = Correction.createCorrectionMessageEl(
        "room@conference.example.net",
        "orig-2",
        "Corrected group message",
        "groupchat"
      );
      expect(msg.getAttribute("type")).toBe("groupchat");
      const replaceEl = msg.getElementsByTagName("replace")[0];
      expect(replaceEl!.getAttribute("id")).toBe("orig-2");
    });

    it("should create message without body when newBody is empty", () => {
      const msg = Correction.createCorrectionMessageEl(
        "romeo@example.net",
        "orig-3",
        "",
        "chat"
      );
      expect(msg.getElementsByTagName("body")[0]).toBeUndefined();
    });
  });

  describe("isCorrection", () => {
    it("should return true for message with replace property", () => {
      const msg = new Proxy(
        { replace: { id: "test-123" } } as any,
        { get: (target, prop) => (prop in target ? (target as any)[prop] : undefined) }
      );
      expect(Correction.isCorrection(msg)).toBe(true);
    });

    it("should return false for message without replace property", () => {
      const msg = {} as any;
      expect(Correction.isCorrection(msg)).toBe(false);
    });
  });

  describe("XEP-0308 example from spec", () => {
    it("should produce correct XML structure matching XEP-0308 Example 2", () => {
      // 对应 XEP-0308 示例 2: 发送消息更正
      const msg = Correction.createCorrectionMessageEl(
        "juliet@example.net",
        "bad1-7497-214",
        "She says: 'I am the tallest!'"
      );
      expect(msg.getAttribute("to")).toBe("juliet@example.net");
      expect(msg.getAttribute("type")).toBe("chat");
      expect(msg.getElementsByTagName("body")[0]?.textContent).toBe(
        "She says: 'I am the tallest!'"
      );
      const replaceEl = msg.getElementsByTagName("replace")[0];
      expect(replaceEl).toBeDefined();
      expect(replaceEl!.namespaceURI).toBe(Correction.NS);
      expect(replaceEl!.getAttribute("id")).toBe("bad1-7497-214");
    });

    it("should parse replace element from XEP-0308 Example 3", () => {
      // 对应 XEP-0308 示例 3: 接收消息更正
      const xml = Parser.parse(`
        <message xmlns='jabber:client' to='romeo@example.net' from='juliet@example.net' type='chat' id='good1-8235-217'>
          <body>She says: 'I am the tallest!'</body>
          <replace xmlns='urn:xmpp:message-correct:0' id='bad1-7497-214'/>
        </message>
      `);
      const replaceEl = xml.getElementsByTagName("replace")[0];
      const result = Correction.parseReplaceEl(replaceEl);
      expect(result.replace.id).toBe("bad1-7497-214");
    });
  });
});
