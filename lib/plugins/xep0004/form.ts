import { XMPPElement } from "@/ltx";

// 表单类型定义
type FormType = "cancel" | "form" | "result" | "submit";

// 字段类型定义
export type FieldType =
    | "boolean"
    | "fixed"
    | "hidden"
    | "jid-multi"
    | "jid-single"
    | "list-multi"
    | "list-single"
    | "text-multi"
    | "text-private"
    | "text-single";

export interface Field<T extends FieldType = FieldType> {
    type?: T;
    var?: string;
    label?: string;
    desc?: string;
    required?: boolean;
    values: string[];
    options?: T extends "list-single" | "list-multi" ? Option[] : never;
}

interface Option {
    label?: string;
    value: string;
}

export interface DataForm {
    type: FormType;
    title?: string;
    instructions?: string;
    fields: Field[];
    reported?: Field[];
    items?: {
        fields: Field[];
    }[];
}

export class Form {
    static readonly NS = "jabber:x:data" as const;
    static readonly FIELD = "field" as const;

    /**
     * 将XEP-0004表单解析为对象
     * @param form NS为jabber:x:data的<x>表单元素
     * @returns 解析后的对象，键为form，值为DataForm对象
     */
    static parseFormEl(form: XMPPElement): { form: DataForm; } {
        if (form.namespaceURI !== Form.NS) throw new Error("不是一个data form");
        const type = form.getAttribute("type") as FormType;
        const title = form.getElementsByTagName("title")[0]?.textContent ?? void 0;
        const instructions =
            form.getElementsByTagName("instructions")[0]?.textContent ?? void 0;
        const reported = Form.parseFields(form.getElementsByTagName("reported")[0]);
        const items = Array.from(form.getElementsByTagName("item")).map((item) => {
            return {
                fields: Form.parseFields(item),
            };
        });
        const fields = Form.parseFields(form);

        return {
            form: {
                type,
                title,
                instructions,
                reported,
                items,
                fields,
            },
        };
    }

    private static parseFields(parent: XMPPElement) {
        if (!parent) return [];
        if (parent.tagName === "field") {
            // 添加一个父元素
            const parentEl = XMPPElement.createElement("parent");
            parentEl.appendChild(parent);
            parent = parentEl;
        }
        return Array.from(Form.getDirectChildren(parent, "field")).map((field) => {
            const options = Array.from(field.getElementsByTagName("option")).map(
                (option) => ({
                    label: option.getAttribute("label") ?? void 0,
                    value: option.getElementsByTagName("value")[0].textContent,
                })
            );

            const fieldType = field.getAttribute("type") as FieldType;

            const result: Field = {
                type: fieldType,
                var: field.getAttribute("var") ?? void 0,
                label: field.getAttribute("label") ?? void 0,
                desc: field.getElementsByTagName("desc")[0]?.textContent ?? void 0,
                required: field.getElementsByTagName("required").length > 0,
                values: Form.getDirectChildren(field, "value")
                    .map((el) => el.textContent)
                    .filter(Boolean),
            };

            if (options.length > 0 && (fieldType === "list-single" || fieldType === "list-multi")) {
                result.options = options;
            }

            return result;
        });
    }

    private static getDirectChildren(
        parent: XMPPElement,
        tagName: string
    ): XMPPElement[] {
        return Array.from(parent.children).filter(
            node => node.tagName === tagName
        );
    }

    private static createFieldEl(field: Field) {
        const fieldEl = XMPPElement.createElement("field");
        if (field.type) fieldEl.setAttribute("type", field.type);
        if (field.var) fieldEl.setAttribute("var", field.var);
        if (field.label) fieldEl.setAttribute("label", field.label);
        if (field.desc) {
            const descEl = XMPPElement.createElement("desc");
            descEl.textContent = field.desc;
            fieldEl.appendChild(descEl);
        }
        if (field.required) {
            const requiredEl = XMPPElement.createElement("required");
            fieldEl.appendChild(requiredEl);
        }
        for (const value of field.values) {
            const valueEl = XMPPElement.createElement("value");
            valueEl.textContent = value;
            fieldEl.appendChild(valueEl);
        }
        for (const option of field.options ?? []) {
            const optionEl = XMPPElement.createElement("option");
            if (option.label) optionEl.setAttribute("label", option.label);
            const valueEl = XMPPElement.createElement("value");
            valueEl.textContent = option.value;
            optionEl.appendChild(valueEl);
            fieldEl.appendChild(optionEl);
        }
        return fieldEl;
    }

    static createFormEl(data: DataForm) {
        const formEl = XMPPElement.createElementNS(Form.NS, "x");
        formEl.setAttribute("type", data.type);
        if (data.title) {
            const title = XMPPElement.createElement("title");
            title.textContent = data.title;
            formEl.appendChild(title);
        }
        if (data.instructions) {
            const instructions = XMPPElement.createElement("instructions");
            instructions.textContent = data.instructions;
            formEl.appendChild(instructions);
        }
        if (data.reported) {
            const reported = XMPPElement.createElement("reported");
            for (const field of data.reported) {
                reported.appendChild(Form.createFieldEl(field));
            }
            formEl.appendChild(reported);
        }
        for (const item of data.items ?? []) {
            const itemEl = XMPPElement.createElement("item");
            for (const field of item.fields) {
                itemEl.appendChild(Form.createFieldEl(field));
            }
            formEl.appendChild(itemEl);
        }
        for (const field of data.fields) {
            formEl.appendChild(Form.createFieldEl(field));
        }
        return formEl;
    }
}
