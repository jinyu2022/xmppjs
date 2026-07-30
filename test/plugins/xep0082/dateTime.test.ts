import { describe, it, expect } from "vitest";
import { XMPPDateTime } from "../../../lib/plugins/xep0082/dateTime";

/**
 * XEP-0082: XMPP Date and Time Profiles
 * @see https://xmpp.org/extensions/xep-0082.html
 * @version 1.2.0 (2024-10-07)
 *
 * 注: formatDate/formatDateTime/formatTime 使用本地时间 getter 并追加 TZD，
 * 因此测试使用本地时间构造 Date 对象以匹配实际行为。
 */
describe("XMPPDateTime", () => {
  describe("formatDate", () => {
    it("should format a Date to CCYY-MM-DD", () => {
      const date = new Date(2025, 0, 15);
      expect(XMPPDateTime.formatDate(date)).toBe("2025-01-15");
    });

    it("should format December date correctly", () => {
      const date = new Date(2024, 11, 25);
      expect(XMPPDateTime.formatDate(date)).toBe("2024-12-25");
    });

    it("should throw for invalid Date", () => {
      expect(() => XMPPDateTime.formatDate(new Date("invalid"))).toThrow(
        "Invalid Date object provided."
      );
    });
  });

  describe("formatDateTime", () => {
    it("should format to CCYY-MM-DDThh:mm:ss with TZD", () => {
      const date = new Date(2025, 6, 18, 14, 30, 0);
      const result = XMPPDateTime.formatDateTime(date);
      expect(result).toMatch(/^2025-07-18T14:30:00(Z|[+-]\d{2}:\d{2})$/);
    });

    it("should include milliseconds when requested", () => {
      const date = new Date(2025, 6, 18, 14, 30, 0, 123);
      const result = XMPPDateTime.formatDateTime(date, true);
      expect(result).toMatch(/^2025-07-18T14:30:00\.123(Z|[+-]\d{2}:\d{2})$/);
    });

    it("should format with custom timezone offset", () => {
      const date = new Date(2025, 6, 18, 12, 0, 0);
      const result = XMPPDateTime.formatDateTime(date, false, "+08:00");
      expect(result).toBe("2025-07-18T12:00:00+08:00");
    });

    it("should throw for invalid timezone format", () => {
      const date = new Date(2025, 6, 18, 12, 0, 0);
      expect(() =>
        XMPPDateTime.formatDateTime(date, false, "invalid")
      ).toThrow("Invalid time zone format");
    });

    it("should throw for invalid Date", () => {
      expect(() =>
        XMPPDateTime.formatDateTime(new Date("invalid"))
      ).toThrow("Invalid Date object provided.");
    });
  });

  describe("formatTime", () => {
    it("should format to hh:mm:ss with TZD", () => {
      const date = new Date(2025, 6, 18, 9, 15, 30);
      const result = XMPPDateTime.formatTime(date);
      expect(result).toMatch(/^09:15:30(Z|[+-]\d{2}:\d{2})$/);
    });

    it("should include milliseconds when requested", () => {
      const date = new Date(2025, 6, 18, 9, 15, 30, 456);
      const result = XMPPDateTime.formatTime(date, true);
      expect(result).toMatch(/^09:15:30\.456(Z|[+-]\d{2}:\d{2})$/);
    });

    it("should format with timezone offset", () => {
      const date = new Date(2025, 6, 18, 6, 30, 0);
      const result = XMPPDateTime.formatTime(date, false, "+05:30");
      expect(result).toBe("06:30:00+05:30");
    });

    it("should throw for invalid timezone format", () => {
      const date = new Date(2025, 6, 18, 12, 0, 0);
      expect(() => XMPPDateTime.formatTime(date, false, "UTC")).toThrow(
        "Invalid time zone format"
      );
    });

    it("should throw for invalid Date", () => {
      expect(() => XMPPDateTime.formatTime(new Date("invalid"))).toThrow(
        "Invalid Date object provided."
      );
    });
  });

  describe("parseDateTime", () => {
    it("should parse CCYY-MM-DDThh:mm:ssZ", () => {
      const result = XMPPDateTime.parseDateTime("2025-07-18T14:30:00Z");
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(0);
    });

    it("should parse CCYYMMDDThh:mm:ss format", () => {
      const result = XMPPDateTime.parseDateTime("20250718T14:30:00");
      expect(result).toBeInstanceOf(Date);
    });

    it("should parse with timezone offset", () => {
      const result = XMPPDateTime.parseDateTime("2025-07-18T22:30:00+08:00");
      expect(result).toBeInstanceOf(Date);
    });

    it("should throw for unparseable string", () => {
      expect(() => XMPPDateTime.parseDateTime("not-a-date")).toThrow();
    });

    it("should throw for empty string", () => {
      expect(() => XMPPDateTime.parseDateTime("")).toThrow();
    });
  });
});
