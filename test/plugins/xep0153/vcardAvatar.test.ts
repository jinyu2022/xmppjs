import { describe, it, expect } from "vitest";
import { XEP0153 } from "../../../lib/plugins/xep0153";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0153: vCard-Based Avatars
 * @see https://xmpp.org/extensions/xep-0153.html
 * @version 1.1.1 (2024-06-10)
 *
 * 根据 XEP-0153 规范，vCard 头像通过以下方式实现:
 * - 在 Presence 中携带 <x xmlns='vcard-temp:x:update'><photo>hash</photo></x>
 * - 通过 vCard-temp IQ 设置/获取头像图片数据
 */
describe("XEP0153", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(XEP0153.NS).toBe("vcard-temp:x:update");
    });
  });

  describe("createUpdatePresence", () => {
    it("should return a presence XML string with photo hash", () => {
      const xml = XEP0153.createUpdatePresence("juliet@example.net", "abc123");
      expect(xml).toContain("<presence");
      expect(xml).toContain("to='juliet@example.net'");
      expect(xml).toContain("<photo>abc123</photo>");
      expect(xml).toContain(XEP0153.NS);
    });
  });

  describe("parseVCardAvatar", () => {
    it("should parse PHOTO element with TYPE and BINVAL", () => {
      const xml = Parser.parse(`
        <vCard xmlns="vcard-temp">
          <PHOTO>
            <TYPE>image/png</TYPE>
            <BINVAL>iVBORw0KGgoAAAANSUhEUgAA...</BINVAL>
          </PHOTO>
        </vCard>
      `);
      const result = XEP0153.parseVCardAvatar(xml);
      expect(result.type).toBe("image/png");
      expect(result.binval).toBe("iVBORw0KGgoAAAANSUhEUgAA...");
    });

    it("should throw when no PHOTO element found", () => {
      const xml = Parser.parse(`
        <vCard xmlns="vcard-temp">
          <FN>Romeo</FN>
        </vCard>
      `);
      expect(() => XEP0153.parseVCardAvatar(xml)).toThrow("没有photo标签");
    });
  });

  describe("createSetVCardAvatarIq", () => {
    it("should create a set IQ with vCard for avatar removal", async () => {
      // 不传 image 表示删除头像
      const iq = await XEP0153.createSetVCardAvatarIq("romeo@example.net");
      expect(iq.getAttribute("type")).toBe("set");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
      const vCard = iq.getElementsByTagName("vCard")[0];
      expect(vCard).toBeDefined();
      expect(vCard!.namespaceURI).toBe("vcard-temp");
    });
  });

  describe("XEP-0153 examples", () => {
    it("should match presence update format from spec", () => {
      // XEP-0153 Example 1: 发送头像哈希的出席
      const xml = XEP0153.createUpdatePresence("juliet@example.net", "sha1hash");
      expect(xml).toContain("<presence");
      expect(xml).toContain("juliet@example.net");
      expect(xml).toContain("sha1hash");
    });
  });
});
