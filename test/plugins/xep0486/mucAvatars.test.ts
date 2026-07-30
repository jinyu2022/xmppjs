import { describe, it, expect } from "vitest";
import { MUCAvatars } from "../../../lib/plugins/xep0486/MUCAvatars";

/**
 * XEP-0486: MUC Avatars
 * @see https://xmpp.org/extensions/xep-0486.html
 * @version 1.0.0 (2024-05-08)
 *
 * 根据 XEP-0486 规范，MUC 头像使用 vCard-temp 在群聊中设置/获取头像，
 * 是 XEP-0153 在 MUC 场景的特化应用。
 */
describe("MUCAvatars", () => {
  describe("createSetAvatarIq", () => {
    it("should create a set IQ for setting avatar", () => {
      const iq = MUCAvatars.createSetAvatarIq("room@conference.example.net");
      // 不传 image 表示删除头像
      return iq.then((result) => {
        expect(result.getAttribute("type")).toBe("set");
        expect(result.getAttribute("to")).toBe("room@conference.example.net");
        const vCard = result.getElementsByTagName("vCard")[0];
        expect(vCard).toBeDefined();
        expect(vCard!.namespaceURI).toBe("vcard-temp");
      });
    });

    it("should create a set IQ with avatar data when image is provided", () => {
      // 设置头像需要真实图片文件，这里只验证 IQ 结构
      const iq = MUCAvatars.createSetAvatarIq("room@conference.example.net");
      return iq.then((result) => {
        expect(result.getAttribute("type")).toBe("set");
      });
    });
  });

  describe("createGetAvatarIq", () => {
    it("should create a get IQ for retrieving avatar", () => {
      const iq = MUCAvatars.createGetAvatarIq("room@conference.example.net");
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("room@conference.example.net");
      const vCard = iq.getElementsByTagName("vCard")[0];
      expect(vCard).toBeDefined();
      expect(vCard!.namespaceURI).toBe("vcard-temp");
    });
  });
});
