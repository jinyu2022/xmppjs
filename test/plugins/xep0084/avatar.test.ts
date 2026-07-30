import { describe, it, expect } from "vitest";
import { Avatar } from "../../../lib/plugins/xep0084/avatar";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0084: User Avatar
 * @see https://xmpp.org/extensions/xep-0084.html
 * @version 1.1.1 (2024-07-15)
 *
 * 根据 XEP-0084 规范，用户头像通过两个 PEP 节点发布:
 * - urn:xmpp:avatar:metadata: 头像元数据（ID、类型、大小、尺寸）
 * - urn:xmpp:avatar:data: 头像图片的 base64 编码数据
 */
describe("Avatar", () => {
  describe("NS", () => {
    it("should have correct namespace constants", () => {
      expect(Avatar.NS.metadata).toBe("urn:xmpp:avatar:metadata");
      expect(Avatar.NS.data).toBe("urn:xmpp:avatar:data");
    });
  });

  describe("parseMetadataEl", () => {
    it("should parse metadata element with single info", () => {
      const xml = Parser.parse(`
        <metadata xmlns="urn:xmpp:avatar:metadata">
          <info id="abc123" type="image/png" bytes="12345" width="128" height="128"/>
        </metadata>
      `);
      const result = Avatar.parseMetadataEl(xml);
      expect(result.metadata).toBeDefined();
    });
  });

  describe("creatRetrieveDataIq", () => {
    it("should create a get IQ to retrieve avatar data", () => {
      const iq = Avatar.creatRetrieveDataIq("romeo@example.net", "abc123");
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
    });
  });
});
