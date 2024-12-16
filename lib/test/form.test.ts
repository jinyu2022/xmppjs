import { describe, it, expect } from 'vitest';
import { Form } from '../plugins/xep0004/form';
import { domParser } from '../shims';
describe('Form', () => {
    describe('parseFormEl', () => {
        it('should parse a form element correctly', () => {
            const doc = domParser.parseFromString(`
                <x xmlns="jabber:x:data" type="form">
                    <title>Test Form</title>
                    <instructions>Fill out this form</instructions>
                    <field var="field1" type="text-single" label="Field 1">
                        <desc>Description for field 1</desc>
                        <required/>
                        <value>Value 1</value>
                        <option label="Option 1">
                            <value>Option 1 Value</value>
                        </option>
                    </field>
                </x>
            `, 'text/xml');
            const formElement = doc.documentElement;
            // console.log(formElement);
            // @ts-ignore
            const parsedForm = Form.parseFormEl(formElement);

            expect(parsedForm).toEqual({
                type: 'form',
                title: 'Test Form',
                instructions: 'Fill out this form',
                reported: [],
                items: [],
                fields: [
                    {
                        type: 'text-single',
                        var: 'field1',
                        label: 'Field 1',
                        desc: 'Description for field 1',
                        required: true,
                        values: ['Value 1'],
                        options: [
                            {
                                label: 'Option 1',
                                value: 'Option 1 Value'
                            }
                        ]
                    }
                ]
            });
        });

        it('should throw an error if the namespace is incorrect', () => {
            const xmlString = `
                <x xmlns="wrong:namespace" type="form"></x>
            `;
            const doc = domParser.parseFromString(xmlString, 'application/xml');
            const formElement = doc.documentElement;
            // @ts-ignore
            expect(() => Form.parseFormEl(formElement)).toThrow('不是一个data form');
        });
    });

    describe('createFormEl', () => {
        it('should create a form element correctly', () => {
            const dataForm = {
                type: 'form' as const,
                title: 'Test Form',
                instructions: ['Fill out this form'],
                fields: [
                    {
                        type: 'text-single' as const,
                        var: 'field1',
                        label: 'Field 1',
                        desc: 'Description for field 1',
                        required: true,
                        values: ['Value 1'],
                        options: [
                            {
                                label: 'Option 1',
                                value: 'Option 1 Value'
                            }
                        ]
                    }
                ]
            };

            const formElement = Form.createFormEl(dataForm);

            expect(formElement.getAttribute('type')).toBe('form');
            expect(formElement.getElementsByTagName('title')[0].textContent).toBe('Test Form');
            expect(formElement.getElementsByTagName('instructions')[0].textContent).toBe('Fill out this form');
            const fieldElement = formElement.getElementsByTagName('field')[0];
            expect(fieldElement.getAttribute('var')).toBe('field1');
            expect(fieldElement.getAttribute('type')).toBe('text-single');
            expect(fieldElement.getAttribute('label')).toBe('Field 1');
            expect(fieldElement.getElementsByTagName('desc')[0].textContent).toBe('Description for field 1');
            expect(fieldElement.getElementsByTagName('required').length).toBe(1);
            expect(fieldElement.getElementsByTagName('value')[0].textContent).toBe('Value 1');
            const optionElement = fieldElement.getElementsByTagName('option')[0];
            expect(optionElement.getAttribute('label')).toBe('Option 1');
            expect(optionElement.getElementsByTagName('value')[0].textContent).toBe('Option 1 Value');
        });
    });
});