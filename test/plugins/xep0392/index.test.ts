import { describe, it, expect } from "vitest";
import { XEP0392 } from "../../../lib/plugins/xep0392";

/**
 * XEP-0392: Consistent Color Generation
 * @see https://xmpp.org/extensions/xep-0392.html
 * @version 1.2.0 (2024-03-20)
 *
 * 根据 XEP-0392 规范，该协议根据字符串（如 JID）生成一贯的颜色。
 * 算法将输入字符串转换为 HSL 颜色值，使得同一字符串始终产生相同的颜色。
 */
describe("XEP0392", () => {
  describe("colorize", () => {
    it("should return a hex color string", async () => {
      const color = await XEP0392.colorize("romeo@example.net");
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("should produce consistent colors for same input", async () => {
      const input = "juliet@example.net";
      const c1 = await XEP0392.colorize(input);
      const c2 = await XEP0392.colorize(input);
      expect(c1).toBe(c2);
    });

    it("should produce different colors for different inputs", async () => {
      const c1 = await XEP0392.colorize("romeo@example.net");
      const c2 = await XEP0392.colorize("juliet@example.net");
      expect(c1).not.toBe(c2);
    });

    it("should use cached results", async () => {
      const input = "test@example.com";
      XEP0392.cache.clear();
      const color = await XEP0392.colorize(input);
      expect(XEP0392.cache.get(input)).toBe(color);
    });

    it("should return cached result on repeated calls", async () => {
      const input = "cached@example.com";
      XEP0392.cache.clear();
      const color = await XEP0392.colorize(input);
      // Call again - should use cache
      const cached = await XEP0392.colorize(input);
      expect(cached).toBe(color);
    });

    it("should handle empty string", async () => {
      const color = await XEP0392.colorize("");
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("should handle single characters", async () => {
      const color = await XEP0392.colorize("a");
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("should handle long strings", async () => {
      const color = await XEP0392.colorize(
        "very.long.username.with.many.parts@example.domain.org"
      );
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
