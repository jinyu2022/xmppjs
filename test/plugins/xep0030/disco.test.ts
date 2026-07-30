import { describe, it, expect } from "vitest";
import { Disco } from "../../../lib/plugins/xep0030/disco";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0030: Service Discovery
 * @see https://xmpp.org/extensions/xep-0030.html
 * @version 2.5.0 (2024-04-30)
 *
 * 根据 XEP-0030 规范，服务发现支持两种查询:
 * - disco#info: 获取实体支持的特性和身份
 * - disco#items: 获取实体的子节点列表
 */
describe("Disco", () => {
  describe("NS", () => {
    it("should have correct namespace constants", () => {
      expect(Disco.NS.DISCO_INFO).toBe("http://jabber.org/protocol/disco#info");
      expect(Disco.NS.DISCO_ITEMS).toBe(
        "http://jabber.org/protocol/disco#items"
      );
    });
  });

  describe("parseDiscoInfo", () => {
    it("should parse identities and features from disco info response", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info">
          <identity category="client" type="bot" name="TestBot"/>
          <identity category="automation" type="command-list" name="Commands"/>
          <feature var="http://jabber.org/protocol/disco#info"/>
          <feature var="urn:xmpp:ping"/>
        </query>
      `);
      const result = Disco.parseDiscoInfo(xml);
      expect(result.identities).toHaveLength(2);
      expect(result.identities[0]).toEqual({
        category: "client",
        type: "bot",
        name: "TestBot",
        lang: undefined,
      });
      expect(result.identities[1]).toEqual({
        category: "automation",
        type: "command-list",
        name: "Commands",
        lang: undefined,
      });
      expect(result.features.has("http://jabber.org/protocol/disco#info")).toBe(
        true
      );
      expect(result.features.has("urn:xmpp:ping")).toBe(true);
      expect(result.features.size).toBe(2);
    });

    it("should handle identity with xml:lang attribute", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info">
          <identity category="client" type="pc" name="Pidgin" xml:lang="en"/>
        </query>
      `);
      const result = Disco.parseDiscoInfo(xml);
      expect(result.identities[0].lang).toBe("en");
    });

    it("should handle disco info wrapped in iq element", () => {
      const xml = Parser.parse(`
        <iq type="result" to="romeo@example.net" from="example.org">
          <query xmlns="http://jabber.org/protocol/disco#info">
            <identity category="server" type="im"/>
            <feature var="http://jabber.org/protocol/disco#info"/>
          </query>
        </iq>
      `);
      const result = Disco.parseDiscoInfo(xml);
      expect(result.identities).toHaveLength(1);
      expect(result.identities[0].category).toBe("server");
      expect(result.features.size).toBe(1);
    });

    it("should return empty arrays when no identities or features", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info"/>
      `);
      const result = Disco.parseDiscoInfo(xml);
      expect(result.identities).toHaveLength(0);
      expect(result.features.size).toBe(0);
    });
  });

  describe("parseDiscoItems", () => {
    it("should parse items from disco items response", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#items">
          <item jid="chat.example.org" name="Chat Service"/>
          <item jid="proxy.example.org" name="Proxy Service"/>
        </query>
      `);
      const items = Disco.parseDiscoItems(xml);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        jid: "chat.example.org",
        node: undefined,
        name: "Chat Service",
      });
      expect(items[1]).toEqual({
        jid: "proxy.example.org",
        node: undefined,
        name: "Proxy Service",
      });
    });

    it("should parse items with node attribute", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#items">
          <item jid="example.org" node="http://jabber.org/protocol/commands" name="Commands"/>
        </query>
      `);
      const items = Disco.parseDiscoItems(xml);
      expect(items[0].node).toBe("http://jabber.org/protocol/commands");
      expect(items[0].name).toBe("Commands");
    });

    it("should handle items wrapped in iq element", () => {
      const xml = Parser.parse(`
        <iq type="result" to="romeo@example.net" from="example.org">
          <query xmlns="http://jabber.org/protocol/disco#items">
            <item jid="conference.example.org" name="Conference Service"/>
          </query>
        </iq>
      `);
      const items = Disco.parseDiscoItems(xml);
      expect(items).toHaveLength(1);
      expect(items[0].jid).toBe("conference.example.org");
    });

    it("should return empty array when no items", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#items"/>
      `);
      const items = Disco.parseDiscoItems(xml);
      expect(items).toHaveLength(0);
    });
  });

  describe("local feature management", () => {
    it("should add and remove features", () => {
      const disco = new Disco();
      disco.addFeature("urn:xmpp:ping");
      expect(disco.features.has("urn:xmpp:ping")).toBe(true);
      disco.removeFeature("urn:xmpp:ping");
      expect(disco.features.has("urn:xmpp:ping")).toBe(false);
    });

    it("should add and remove identities", () => {
      const disco = new Disco();
      disco.addIdentity("client", "bot", "TestBot");
      expect(disco.identities).toHaveLength(1);
      expect(disco.identities[0]).toEqual({
        category: "client",
        type: "bot",
        name: "TestBot",
        lang: undefined,
      });
      disco.removeIdentity("client", "bot", "TestBot");
      expect(disco.identities).toHaveLength(0);
    });

    it("should add and remove items", () => {
      const disco = new Disco();
      disco.addItem("chat.example.org", undefined, "Chat");
      expect(disco.items).toHaveLength(1);
      expect(disco.items[0]).toEqual({
        jid: "chat.example.org",
        node: undefined,
        name: "Chat",
      });
      disco.removeItem("chat.example.org", "Chat");
      expect(disco.items).toHaveLength(0);
    });
  });

  describe("createInfoResult", () => {
    it("should create an iq result with disco info payload", () => {
      const disco = new Disco();
      disco.addIdentity("client", "bot", "TestBot");
      disco.addFeature("urn:xmpp:ping");
      const iq = disco.createInfoResult("romeo@example.net", "info-1");
      expect(iq.getAttribute("type")).toBe("result");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
      expect(iq.getAttribute("id")).toBe("info-1");
      const query = iq.getElementsByTagNameNS(
        Disco.NS.DISCO_INFO,
        "query"
      )[0];
      expect(query).toBeDefined();
      const identities = query!.getElementsByTagName("identity");
      expect(identities).toHaveLength(1);
      expect(identities[0].getAttribute("category")).toBe("client");
      const features = query!.getElementsByTagName("feature");
      expect(features).toHaveLength(1);
      expect(features[0].getAttribute("var")).toBe("urn:xmpp:ping");
    });
  });

  describe("createItemsResult", () => {
    it("should create an iq result with disco items payload", () => {
      const disco = new Disco();
      disco.addItem("chat.example.org", undefined, "Chat Service");
      const iq = disco.createItemsResult("romeo@example.net", "items-1");
      expect(iq.getAttribute("type")).toBe("result");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
      const query = iq.getElementsByTagNameNS(
        Disco.NS.DISCO_ITEMS,
        "query"
      )[0];
      expect(query).toBeDefined();
      const items = query!.getElementsByTagName("item");
      expect(items).toHaveLength(1);
      expect(items[0].getAttribute("jid")).toBe("chat.example.org");
      expect(items[0].getAttribute("name")).toBe("Chat Service");
    });
  });
});
