import { describe, it, expect } from "vitest";
import { Nickname } from "../../../lib/plugins/xep0172/nickname";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0172: User Nickname
 * @see https://xmpp.org/extensions/xep-0172.html
 * @version 1.1.0 (2022-01-25)
 *
 * 根据 XEP-0172 规范，用户昵称通过 <nick/> 元素传递:
 * - 可包含在 Presence 中: 加入群聊或发送出席时携带昵称
 * - 可包含在 Message 中: 发送消息时携带昵称
 * - 可通过 PEP 发布/获取昵称
 */
describe("Nickname", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Nickname.NS).toBe("http://jabber.org/protocol/nick");
    });
  });

  describe("parseNickEl", () => {
    it("should parse a nick element", () => {
      const el = XMPPElement.createElementNS(Nickname.NS, "nick");
      el.textContent = "Romeo";
      const result = Nickname.parseNickEl(el);
      expect(result.nick).toBe("Romeo");
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "nick");
      el.textContent = "Test";
      expect(() => Nickname.parseNickEl(el)).toThrow("不是一个nick元素");
    });
  });

  describe("createNickSubscribe", () => {
    it("should create a presence with nick element", () => {
      const pres = Nickname.createNickSubscribe("romeo@example.net", "Romeo");
      expect(pres.tagName).toBe("presence");
      expect(pres.getAttribute("to")).toBe("romeo@example.net");
      const nickEl = pres.getElementsByTagName("nick")[0];
      expect(nickEl).toBeDefined();
      expect(nickEl!.namespaceURI).toBe(Nickname.NS);
      expect(nickEl!.textContent).toBe("Romeo");
    });
  });

  describe("createNickMessage", () => {
    it("should create a chat message with nick element", () => {
      const msg = Nickname.createNickMessage(
        "juliet@example.net",
        "Hello!",
        "Juliet"
      );
      expect(msg.tagName).toBe("message");
      expect(msg.getAttribute("to")).toBe("juliet@example.net");
      expect(msg.getAttribute("type")).toBe("chat");
      expect(msg.getElementsByTagName("body")[0]?.textContent).toBe("Hello!");
      const nickEl = msg.getElementsByTagName("nick")[0];
      expect(nickEl).toBeDefined();
      expect(nickEl!.namespaceURI).toBe(Nickname.NS);
      expect(nickEl!.textContent).toBe("Juliet");
    });
  });

  describe("createNickPublishIq", () => {
    it("should create a publish IQ for PEP", () => {
      const iq = Nickname.createNickPublishIq("MyNick");
      expect(iq.tagName).toBe("iq");
      expect(iq.getAttribute("type")).toBe("set");
    });
  });

  describe("createRetrieveNickIq", () => {
    it("should create a retrieve IQ for PEP", () => {
      const iq = Nickname.createRetrieveNickIq("romeo@example.net");
      expect(iq.tagName).toBe("iq");
      expect(iq.getAttribute("type")).toBe("get");
    });
  });
});
