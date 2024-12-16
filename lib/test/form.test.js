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
    // @ts-ignore
    const form = Form.parseFormEl(formEl.documentElement);
    console.log(form);
    console.log(form.items[0]);
  });
})