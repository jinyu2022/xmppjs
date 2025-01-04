import { expect, it, describe } from "vitest";
import { Form } from "../plugins/xep0004/form";
import { domParser } from "../shims";
describe("测试Form", () => {
  it("测试解析Form", () => {
    const formEl = domParser.parseFromString(`
    <x xmlns='jabber:x:data' type='result'>
      <title>Joogle Search: verona</title>
      <reported>
        <field var='name'/>
        <field var='url'/>
      </reported>
      
      <item>
        <field var='name'>
          <value>Universita degli Studi di Verona - Home Page</value>
        </field>
        <field var='url'>
          <value>http://www.univr.it/</value>
        </field>
      </item>
    </x>`, "text/xml");
    const form = Form.parseFormEl(formEl.documentElement).form;
    expect(form).toEqual({
      fields: [],
      instructions: undefined,
      items: [
        {
          fields: [
            {
              desc: undefined,
              label: undefined,
              options: [],
              required: false,
              type: null,
              values: [
                "Universita degli Studi di Verona - Home Page",
              ],
              var: "name",
            },
            {
              desc: undefined,
              label: undefined,
              options: [],
              required: false,
              type: null,
              values: [
                "http://www.univr.it/",
              ],
              var: "url",
            },
          ],
        },
      ],
      reported: [
        {
          desc: undefined,
          label: undefined,
          options: [],
          required: false,
          type: null,
          values: [],
          var: "name",
        },
        {
          desc: undefined,
          label: undefined,
          options: [],
          required: false,
          type: null,
          values: [],
          var: "url",
        },
      ],
      title: "Joogle Search: verona",
      type: "result",
    })
  });

  it("测试解析Form2", () => {
    const formEl = domParser.parseFromString(`
          <x type="result" xmlns="jabber:x:data">
      <field var="FORM_TYPE" type="hidden">
        <value>http://jabber.org/network/serverinfo</value>
      </field>
            <field var="abuse-addresses" type="list-multi">
              <value>mailto:support@anoxinon.me</value>
      </field>
            <field var="support-addresses" type="list-multi">
              <value>mailto:support@anoxinon.me</value>
      </field>
            <field var="admin-addresses" type="list-multi">
              <value>mailto:support@anoxinon.me</value>
      </field>
      </x>`, "text/xml");
    const form = Form.parseFormEl(formEl.documentElement).form;
    expect(form).toEqual({
      fields: [
        {
          options: [],
          required: false,
          type: "hidden",
          values: [
            "http://jabber.org/network/serverinfo",
          ],
          var: "FORM_TYPE",
        },
        {
          options: [],
          required: false,
          type: "list-multi",
          values: [
            "mailto:support@anoxinon.me",
          ],
          var: "abuse-addresses",
        },
        {
          options: [],
          required: false,
          type: "list-multi",
          values: [
            "mailto:support@anoxinon.me",
          ],
          var: "support-addresses",
        },
        {
          options: [],
          required: false,
          type: "list-multi",
          values: [
            "mailto:support@anoxinon.me",
          ],
          var: "admin-addresses",
        },
      ],
      items: [],
      reported: [],
      type: "result",
    })
  });
})