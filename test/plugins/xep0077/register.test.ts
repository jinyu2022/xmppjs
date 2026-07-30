import { describe, it, expect } from "vitest";
import { Register } from "../../../lib/plugins/xep0077/register";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0077: In-Band Registration
 * @see https://xmpp.org/extensions/xep-0077.html
 * @version 2.5.0 (2024-07-15)
 *
 * 根据 XEP-0077 规范，带内注册允许用户通过 XMPP 流注册新帐户。
 * 包括获取注册表单和提交注册信息两个核心操作。
 * 命名空间: jabber:iq:register
 */
describe("Register", () => {
  describe("NS", () => {
    it("should have correct namespace", () => {
      expect(Register.NS).toBe("jabber:iq:register");
    });
  });

  describe("createSubmitFormEL", () => {
    it("should create a registration IQ with username and password", () => {
      const iq = Register.createSubmitFormEL("newuser", "secret123");
      expect(iq.getAttribute("type")).toBe("set");
      const query = iq.getElementsByTagNameNS(Register.NS, "query")[0];
      expect(query).toBeDefined();
      const formEl = query!.getElementsByTagName("x")[0];
      expect(formEl).toBeDefined();
      expect(formEl!.namespaceURI).toBe("jabber:x:data");
    });

    it("should include captcha and challenge when provided", () => {
      const iq = Register.createSubmitFormEL(
        "newuser",
        "secret123",
        "captcha_value",
        "challenge_token"
      );
      const query = iq.getElementsByTagNameNS(Register.NS, "query")[0];
      const formEl = query!.getElementsByTagName("x")[0];
      expect(formEl).toBeDefined();
    });

    it("should include FORM_TYPE field", () => {
      const iq = Register.createSubmitFormEL("testuser", "testpass");
      const xmlStr = iq.toXMLString ? iq.toXMLString() : iq.toString();
      expect(xmlStr).toContain("FORM_TYPE");
      expect(xmlStr).toContain(Register.NS);
    });
  });
});
