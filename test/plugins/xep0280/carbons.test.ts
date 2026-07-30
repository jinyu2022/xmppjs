import { describe, it, expect } from "vitest";
import { Carbons } from "../../../lib/plugins/xep0280/carbons";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0280: Message Carbons
 * @see https://xmpp.org/extensions/xep-0280.html
 * @version 1.1.0 (2024-07-15)
 *
 * 根据 XEP-0280 规范，消息碳副本允许服务器将消息副本发送到同一用户的其他资源:
 * - <enable/>: 启用碳副本
 * - <disable/>: 禁用碳副本
 * - <received/>: 在其他资源上接收的消息
 * - <sent/>: 从其他资源发送的消息
 */
describe("Carbons", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Carbons.NS).toBe("urn:xmpp:carbons:2");
    });
  });

  describe("createEnableIq", () => {
    it("should create a set IQ with enable element", () => {
      const iq = Carbons.createEnableIq();
      expect(iq.getAttribute("type")).toBe("set");
      const enable = iq.getElementsByTagName("enable")[0];
      expect(enable).toBeDefined();
      expect(enable!.namespaceURI).toBe(Carbons.NS);
    });
  });

  describe("createDisableIq", () => {
    it("should create a set IQ with disable element", () => {
      const iq = Carbons.createDisableIq();
      expect(iq.getAttribute("type")).toBe("set");
      const disable = iq.getElementsByTagName("disable")[0];
      expect(disable).toBeDefined();
      expect(disable!.namespaceURI).toBe(Carbons.NS);
    });
  });

  describe("parseCarbonEl", () => {
    it("should parse a received carbon element", () => {
      const xml = Parser.parse(`
        <received xmlns="urn:xmpp:carbons:2">
          <forwarded xmlns="urn:xmpp:forward:0">
            <message xmlns="jabber:client" from="romeo@example.net" to="juliet@example.net" type="chat">
              <body>Hello!</body>
            </message>
          </forwarded>
        </received>
      `);
      const result = Carbons.parseCarbonEl(xml);
      expect(result.carbon.type).toBe("received");
      expect(result.carbon.forwarded).toBeDefined();
    });

    it("should parse a sent carbon element", () => {
      const xml = Parser.parse(`
        <sent xmlns="urn:xmpp:carbons:2">
          <forwarded xmlns="urn:xmpp:forward:0">
            <message xmlns="jabber:client" to="romeo@example.net" type="chat">
              <body>Hey there!</body>
            </message>
          </forwarded>
        </sent>
      `);
      const result = Carbons.parseCarbonEl(xml);
      expect(result.carbon.type).toBe("sent");
      expect(result.carbon.forwarded).toBeDefined();
    });

    it("should find received element as child when wrapper provided", () => {
      const xml = Parser.parse(`
        <message xmlns="jabber:client" from="example.net" to="juliet@example.net">
          <received xmlns="urn:xmpp:carbons:2">
            <forwarded xmlns="urn:xmpp:forward:0">
              <message xmlns="jabber:client" from="romeo@example.net" to="juliet@example.net" type="chat">
                <body>Test</body>
              </message>
            </forwarded>
          </received>
        </message>
      `);
      const result = Carbons.parseCarbonEl(xml);
      expect(result.carbon.type).toBe("received");
    });

    it("should throw when no carbon element found", () => {
      const el = XMPPElement.createElement("message");
      expect(() => Carbons.parseCarbonEl(el)).toThrow("未找到 carbon 元素");
    });
  });
});
