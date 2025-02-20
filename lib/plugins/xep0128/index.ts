import { Form } from "../xep0004/form";

/**
 * XEP-0128: Service Discovery Extensions  
 * 已经包含在XEP-0030中，无需额外导入
 * @version 1.0.1 (2019-07-30)
 */
export class XEP0128 {
    static parseDataForm(xml: Element) {
        if (xml.namespaceURI !== Form.NS) {
            xml = xml.getElementsByTagNameNS(Form.NS, "x")[0];
            if (!xml) {
                return { form: void 0 };
            }
        }
        return Form.parseFormEl(xml);
    }
}