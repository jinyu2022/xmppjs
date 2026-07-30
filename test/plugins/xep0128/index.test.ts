import { describe, it, expect } from "vitest";
import { XEP0128 } from "../../../lib/plugins/xep0128";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * XEP-0128: Service Discovery Extensions
 * @see https://xmpp.org/extensions/xep-0128.html
 * @version 1.2.0 (2024-07-15)
 *
 * 根据 XEP-0128 规范，服务发现扩展通过 Data Forms 在 disco#info 中提供额外元数据。
 * 扩展信息以 x 元素包含在 query 元素中。
 */
describe("XEP0128", () => {
  describe("parseDataForm", () => {
    it("should parse extension data form from disco info", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info">
          <x xmlns="jabber:x:data" type="result">
            <field var="FORM_TYPE" type="hidden">
              <value>urn:xmpp:dataforms:software</value>
            </field>
            <field var="software" type="text-single" label="Software">
              <value>MyApp</value>
            </field>
            <field var="software_version" type="text-single" label="Software Version">
              <value>1.0</value>
            </field>
          </x>
        </query>
      `);
      const result = XEP0128.parseDataForm(xml);
      expect(result.form).toBeDefined();
      expect(result.form!.fields).toHaveLength(3);
      expect(result.form!.fields[0].values[0]).toBe(
        "urn:xmpp:dataforms:software"
      );
      expect(result.form!.fields[1].var).toBe("software");
      expect(result.form!.fields[1].values[0]).toBe("MyApp");
    });

    it("should return void when no data form present", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info">
          <identity category="server" type="im"/>
        </query>
      `);
      const result = XEP0128.parseDataForm(xml);
      expect(result.form).toBeUndefined();
    });

    it("should parse first extension data form", () => {
      const xml = Parser.parse(`
        <query xmlns="http://jabber.org/protocol/disco#info">
          <x xmlns="jabber:x:data" type="result">
            <field var="FORM_TYPE" type="hidden">
              <value>urn:xmpp:dataforms:software</value>
            </field>
            <field var="os" type="text-single" label="OS">
              <value>Linux</value>
            </field>
          </x>
          <x xmlns="jabber:x:data" type="result">
            <field var="FORM_TYPE" type="hidden">
              <value>urn:xmpp:extensions:custom</value>
            </field>
            <field var="feature_enabled" type="boolean" label="Feature Enabled">
              <value>1</value>
            </field>
          </x>
        </query>
      `);
      const result = XEP0128.parseDataForm(xml);
      expect(result.form).toBeDefined();
      // 只返回第一个 x 表单
      expect(result.form!.fields[0].values[0]).toBe("urn:xmpp:dataforms:software");
    });
  });
});
