import { describe, it, expect } from "vitest";
import { StreamManagement } from "../../../lib/plugins/xep0198/streamManagement";

/**
 * XEP-0198: Stream Management
 * @see https://xmpp.org/extensions/xep-0198.html
 * @version 1.6.0 (2022-05-19)
 *
 * 根据 XEP-0198 规范，流管理允许:
 * - 确认 stanza 的收发（ack）
 * - 请求确认（r）
 * - 在重连后恢复会话（resume）
 * - 命名空间: urn:xmpp:sm:3
 */
describe("StreamManagement", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(StreamManagement.NS).toBe("urn:xmpp:sm:3");
    });
  });
});
