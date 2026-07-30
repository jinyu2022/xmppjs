import { describe, it, expect } from "vitest";
import { Bookmarks } from "../../../lib/plugins/xep0402/bookmarks";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0402: PEP Native Bookmarks
 * @see https://xmpp.org/extensions/xep-0402.html
 * @version 1.2.0 (2024-07-15)
 *
 * 根据 XEP-0402 规范，书签通过 PEP 发布，每个书签是一个 conference 元素:
 * - jid: 房间 JID（在 item 的 id 属性中）
 * - name: 用户指定的群聊名称
 * - autojoin: 自动加入
 * - nick: 房间昵称
 * - password: 房间密码
 * - extensions: 扩展元素
 */
describe("Bookmarks", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Bookmarks.NS).toBe("urn:xmpp:bookmarks:1");
    });
  });

  describe("createRetrieveBookmarksIq", () => {
    it("should create a get IQ to retrieve bookmarks", () => {
      const iq = Bookmarks.createRetrieveBookmarksIq("romeo@example.net");
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
    });
  });

  describe("pareseConferenceEl", () => {
    it("should parse a conference element with all attributes", () => {
      const xml = Parser.parse(`
        <conference xmlns="urn:xmpp:bookmarks:1" name="Test Room" autojoin="true">
          <nick>Romeo</nick>
          <password>secret</password>
        </conference>
      `);
      const result = Bookmarks.pareseConferenceEl(xml);
      expect(result.conference.name).toBe("Test Room");
      expect(result.conference.autojoin).toBe(true);
      expect(result.conference.nick).toBe("Romeo");
      expect(result.conference.password).toBe("secret");
    });

    it("should parse a conference element with minimal attributes", () => {
      const xml = Parser.parse(`
        <conference xmlns="urn:xmpp:bookmarks:1" name="Simple Room"/>
      `);
      const result = Bookmarks.pareseConferenceEl(xml);
      expect(result.conference.name).toBe("Simple Room");
      expect(result.conference.autojoin).toBe(false);
      expect(result.conference.nick).toBeUndefined();
      expect(result.conference.password).toBeUndefined();
    });

    it("should throw when element is not a conference", () => {
      const el = XMPPElement.createElement("not-conference");
      expect(() => Bookmarks.pareseConferenceEl(el)).toThrow(
        "不是一个conference元素"
      );
    });
  });

  describe("createAddBookmarkIq", () => {
    it("should create a publish IQ for adding a bookmark", () => {
      const iq = Bookmarks.createAddBookmarkIq({
        jid: "room@conference.example.net",
        name: "My Room",
        autojoin: true,
        nick: "Romeo",
      });
      expect(iq.getAttribute("type")).toBe("set");
    });

    it("should create a publish IQ without optional fields", () => {
      const iq = Bookmarks.createAddBookmarkIq({
        jid: "simple@conference.example.net",
        name: "Simple Room",
      });
      expect(iq.getAttribute("type")).toBe("set");
    });
  });

  describe("createDeleteBookmarkIq", () => {
    it("should create a retract IQ for deleting a bookmark", () => {
      const iq = Bookmarks.createDeleteBookmarkIq("room@conference.example.net");
      expect(iq.getAttribute("type")).toBe("set");
    });
  });

  describe("parseBookmarksEvent", () => {
    it("should parse a bookmarks PEP event", () => {
      // parseBookmarksEvent 接收一个元素，其 namespace 为 Bookmarks.NS，
      // 并包含 <items> 子元素（内部包含 conference 元数据）
      const xml = Parser.parse(`<x xmlns="urn:xmpp:bookmarks:1"><items node="urn:xmpp:bookmarks:1">
            <item id="room@conference.example.net">
              <conference xmlns="urn:xmpp:bookmarks:1" name="Test Room" autojoin="true">
                <nick>Romeo</nick>
                <password>secret</password>
              </conference>
            </item>
          </items></x>`);
      const items = Bookmarks.parseBookmarksEvent(xml);
      expect(items).toHaveLength(1);
      expect(items[0].jid).toBe("room@conference.example.net");
      expect(items[0].name).toBe("Test Room");
      expect(items[0].autojoin).toBe(true);
      expect(items[0].nick).toBe("Romeo");
      expect(items[0].password).toBe("secret");
    });
  });
});
