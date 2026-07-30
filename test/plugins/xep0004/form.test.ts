import { describe, it, expect } from "vitest";
import { Form } from "../../../lib/plugins/xep0004/form";
import { Parser } from "../../../lib/ltx/Parser";

/**
 * @description XMPP Data Form (XEP-0004) 单元测试
 */
describe('Form', () => {

    describe('parseFormEl', () => {
        it('should parse various field types including options and requirements correctly', () => {
            /**
             * 包含多种字段类型的XML字符串
             */
            const xmlString = `
                <x xmlns="jabber:x:data" type="form">
                    <field var="f1" type="text-single" label="Text Single Field">
                        <value>TS Value</value>
                    </field>
                    <field var="f2" type="boolean" label="Boolean Field">
                        <value>1</value>
                    </field>
                    <field var="f3" type="list-multi" label="List Multi Field">
                        <required/>
                        <value>LM1</value>
                        <value>LM2</value>
                        <option label="Opt A"><value>A</value></option>
                        <option label="Opt B"><value>B</value></option>
                    </field>
                    <field type="fixed" label="Fixed Text">
                        <desc>Fixed description</desc>
                    </field>
                    <field var="f5" type="hidden">
                        <value>Secret</value></field>
                </x>
            `;
            // 使用项目中的 Parser 将 XML 字符串解析为 XMPPElement
            const formElement = Parser.parse(xmlString);
            const parsedForm = Form.parseFormEl(formElement).form;

            // 验证字段数量
            expect(parsedForm.fields.length).toBe(5);

            // 验证 text-single 字段
            expect(parsedForm.fields[0]).toEqual({
                type: 'text-single',
                var: 'f1',
                label: 'Text Single Field',
                desc: undefined,
                required: false,
                values: ['TS Value'],
                options: undefined,
            });

            // 验证 boolean 字段
            expect(parsedForm.fields[1]).toEqual({
                type: 'boolean',
                var: 'f2',
                label: 'Boolean Field',
                desc: undefined,
                required: false,
                values: ['1'],
                options: undefined,
            });

            // 验证 list-multi 字段 (包含 required, 多个值和选项)
            expect(parsedForm.fields[2]).toEqual({
                type: 'list-multi',
                var: 'f3',
                label: 'List Multi Field',
                desc: undefined,
                required: true,
                values: ['LM1', 'LM2'],
                options: [
                    { label: 'Opt A', value: 'A' },
                    { label: 'Opt B', value: 'B' },
                ],
            });

            // 验证 fixed 字段 (无 var, 有 desc)
            expect(parsedForm.fields[3]).toEqual({
                type: 'fixed',
                var: undefined,
                label: 'Fixed Text',
                desc: 'Fixed description',
                required: false,
                values: [],
                options: undefined,
            });

            // 验证 hidden 字段 (有值)
            expect(parsedForm.fields[4]).toEqual({
                type: 'hidden',
                var: 'f5',
                label: undefined,
                desc: undefined,
                required: false,
                values: ['Secret'],
                options: undefined,
            });
        });
    });

    describe('createFormEl', () => {
        it('should create XML for various field types including requirements and options', () => {
            /**
             * 包含多种字段类型的 DataForm 对象
             */
            const dataForm = {
                type: 'form' as const,
                fields: [
                    {
                        type: 'jid-single' as const,
                        var: 'jid1',
                        label: 'JID Single',
                        values: ['user@example.com'],
                    },
                    {
                        type: 'text-multi' as const,
                        var: 'tm1',
                        values: ['Line 1', 'Line 2'],
                        required: true,
                    },
                    {
                        type: 'list-single' as const,
                        var: 'ls1',
                        label: 'List Single',
                        values: ['B'],
                        options: [
                            { label: 'Option A', value: 'A' },
                            { label: 'Option B', value: 'B' },
                        ],
                    },
                    {
                        type: 'fixed' as const,
                        desc: 'A fixed message.',
                        values: [],
                    },
                ]
            };

            const formElement = Form.createFormEl(dataForm);
            const fields = formElement.getElementsByTagName('field');

            expect(fields.length).toBe(4);

            // 验证 jid-single 字段
            const field0 = fields[0];
            expect(field0.getAttribute('type')).toBe('jid-single');
            expect(field0.getAttribute('var')).toBe('jid1');
            expect(field0.getChildren('value')[0]?.textContent).toBe('user@example.com');

            // 验证 text-multi 字段 (包含 required 和多个值)
            const field1 = fields[1];
            expect(field1.getAttribute('type')).toBe('text-multi');
            expect(field1.getAttribute('var')).toBe('tm1');
            expect(field1.getElementsByTagName('required').length).toBe(1);
            const values1 = field1.getChildren('value');
            expect(values1.length).toBe(2);
            expect(values1[0].textContent).toBe('Line 1');
            expect(values1[1].textContent).toBe('Line 2');

            // 验证 list-single 字段 (包含 options)
            const field2 = fields[2];
            expect(field2.getAttribute('type')).toBe('list-single');
            expect(field2.getAttribute('var')).toBe('ls1');
            expect(field2.getChildren('value')[0]?.textContent).toBe('B');
            const options2 = field2.getChildren('option');
            expect(options2.length).toBe(2);
            expect(options2[0].getAttribute('label')).toBe('Option A');
            expect(options2[0].getChildren('value')[0]?.textContent).toBe('A');

            // 验证 fixed 字段 (包含 desc)
            const field3 = fields[3];
            expect(field3.getAttribute('type')).toBe('fixed');
            expect(field3.getAttribute('var')).toBeNull();
            expect(field3.getChildren('desc')[0]?.textContent).toBe('A fixed message.');
            expect(field3.getChildren('value').length).toBe(0);
        });
    });
});
