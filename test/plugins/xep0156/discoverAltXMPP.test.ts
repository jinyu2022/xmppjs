import { describe, it, expect } from "vitest";
import { XMPPDiscoverer } from "../../../lib/plugins/xep0156/discoverAltXMPP";

/**
 * XEP-0156: Discovering Alternative XMPP Connection Methods
 * @see https://xmpp.org/extensions/xep-0156.html
 * @version 1.3.0 (2024-03-14)
 *
 * 根据 XEP-0156 规范，该协议通过 DNS 或 HTTP 发现替代的 XMPP 连接方法
 * （WebSocket、HTTP Polling、BOSH）。
 */
describe("XMPPDiscoverer", () => {
  it("should export the discoverAltXMPP static method", () => {
    expect(typeof XMPPDiscoverer.discoverAltXMPP).toBe("function");
  });

  it("should reject for unreachable domain", async () => {
    await expect(
      XMPPDiscoverer.discoverAltXMPP("invalid-unreachable-domain.example", 500)
    ).rejects.toThrow();
  }, 10000);
});
