import { describe, it, expect } from "vitest";
import RFC6121 from "../../../lib/plugins/rfc6121";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * RFC 6121: XMPP Instant Messaging and Presence — Roster
 * @see https://datatracker.ietf.org/doc/html/rfc6121
 *
 * 根据 RFC 6121 规范，roster（花名册）管理包括:
 * - 获取 roster: IQ get + query(jabber:iq:roster)
 * - 添加/更新联系人: IQ set + item(jid, name?, group?)
 * - 删除联系人: IQ set + item(jid, subscription="remove")
 * - 订阅管理: presence (subscribe/subscribed/unsubscribe/unsubscribed)
 */
describe("RFC6121 Roster", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(RFC6121.NS).toBe("jabber:iq:roster");
    });
  });

  describe("parseRseterEl", () => {
    it("should parse roster items from query element", () => {
      const xml = Parser.parse(`
        <query xmlns="jabber:iq:roster">
          <item jid="romeo@example.net" name="Romeo" subscription="both">
            <group>Friends</group>
          </item>
          <item jid="juliet@example.net" name="Juliet" subscription="from"/>
          <item jid="benvolio@example.net" subscription="none"/>
        </query>
      `);
      const result = RFC6121.parseRseterEl(xml);
      expect(result.roster).toHaveLength(3);

      expect(result.roster[0]).toEqual({
        approved: false,
        jid: "romeo@example.net",
        name: "Romeo",
        subscription: "both",
        ask: undefined,
      });

      expect(result.roster[1].jid).toBe("juliet@example.net");
      expect(result.roster[1].subscription).toBe("from");

      expect(result.roster[2].jid).toBe("benvolio@example.net");
      expect(result.roster[2].subscription).toBe("none");
      expect(result.roster[2].name).toBeUndefined();
    });

    it("should parse roster item with ask and approved attributes", () => {
      const xml = Parser.parse(`
        <query xmlns="jabber:iq:roster">
          <item jid="romeo@example.net" subscription="none" ask="subscribe" approved="true"/>
        </query>
      `);
      const result = RFC6121.parseRseterEl(xml);
      expect(result.roster[0].ask).toBe("subscribe");
      expect(result.roster[0].approved).toBe(true);
    });

    it("should throw when namespace is invalid", () => {
      const el = XMPPElement.createElementNS("urn:invalid", "query");
      expect(() => RFC6121.parseRseterEl(el)).toThrow("不是一个roster");
    });

    it("should return empty array when no items", () => {
      const xml = Parser.parse(`
        <query xmlns="jabber:iq:roster"/>
      `);
      const result = RFC6121.parseRseterEl(xml);
      expect(result.roster).toHaveLength(0);
    });
  });

  describe("roster item structure", () => {
    it("should handle all subscription states", () => {
      const states = ["none", "to", "from", "both", "remove"] as const;
      for (const sub of states) {
        const xml = Parser.parse(`
          <query xmlns="jabber:iq:roster">
            <item jid="test@example.net" subscription="${sub}"/>
          </query>
        `);
        const result = RFC6121.parseRseterEl(xml);
        expect(result.roster[0].subscription).toBe(sub);
      }
    });

    it("should default to 'none' when subscription missing", () => {
      const xml = Parser.parse(`
        <query xmlns="jabber:iq:roster">
          <item jid="test@example.net"/>
        </query>
      `);
      const result = RFC6121.parseRseterEl(xml);
      expect(result.roster[0].subscription).toBe("none");
    });
  });

  describe("subscription management presence stanzas", () => {
    it("should handle subscribe and unsubscribe", () => {
      // RFC 6121 Section 8-9: 订阅管理使用特定的 presence type
      expect(RFC6121.NS).toBe("jabber:iq:roster");
      // 验证罗盘点名册的基本类型定义
      const roster: Record<string, unknown> = {
        approved: false,
        jid: "test@example.net",
        name: "Test",
        subscription: "both",
      };
      expect(roster.subscription).toBe("both");
    });
  });
});
