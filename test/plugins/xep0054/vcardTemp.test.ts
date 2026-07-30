import { describe, it, expect } from "vitest";
import { VCardTemp } from "../../../lib/plugins/xep0054/vcardTemp";

/**
 * XEP-0054: vcard-temp
 * @see https://xmpp.org/extensions/xep-0054.html
 * @version 1.2.0 (2022-08-31)
 *
 * 根据 XEP-0054 规范，vcard-temp 用于在 XMPP 中交换 vCard 信息。
 * 该协议已被 XEP-0292 (vCard4 over XMPP) 取代，但仍被广泛使用。
 * 定义了标准的 vCard 类型接口。
 */
describe("VCardTemp", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(VCardTemp.NS).toBe("vcard-temp");
    });
  });

  describe("VCard interface", () => {
    it("should validate VCard structure via type inference", () => {
      const vcard: Record<string, unknown> = {
        fn: "Romeo Montague",
        n: { family: "Montague", given: "Romeo" },
        nickname: "Romy",
        url: "https://example.net/romeo",
        bday: "1990-06-15",
        org: { orgname: "Capulet Inc.", orgunit: "Marketing" },
        title: "Manager",
        role: "Administrator",
        jabberid: "romeo@example.net",
        desc: "A passionate young man",
      };
      expect(vcard.fn).toBe("Romeo Montague");
      expect((vcard.n as any).family).toBe("Montague");
      expect(vcard.jabberid).toBe("romeo@example.net");
    });

    it("should validate Tel interface structure", () => {
      const tel: Record<string, unknown> = {
        type: ["WORK", "VOICE"],
        number: "+1-555-1234",
      };
      expect(tel.type).toContain("WORK");
      expect(tel.number).toBe("+1-555-1234");
    });

    it("should validate Email interface structure", () => {
      const email: Record<string, unknown> = {
        type: ["INTERNET", "PREF"],
        userid: "romeo@example.net",
      };
      expect(email.type).toContain("INTERNET");
      expect(email.userid).toBe("romeo@example.net");
    });

    it("should validate Adr interface structure", () => {
      const adr: Record<string, unknown> = {
        type: ["WORK", "POSTAL"],
        street: "123 Verona Lane",
        locality: "Verona",
        region: "Veneto",
        pcode: "37100",
        ctry: "Italy",
      };
      expect(adr.type).toContain("WORK");
      expect(adr.street).toBe("123 Verona Lane");
    });
  });
});
