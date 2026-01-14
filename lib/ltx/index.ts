// e:\git\ltx\src\index.ts

import { XMPPElement } from "./Element.js";
import { Parser } from "./Parser.js";
import { escapeXML, unescapeXML, escapeXMLText, unescapeXMLText } from "./escape.js";

// 导出核心 Element 类
export { XMPPElement, Parser, escapeXML, unescapeXML, escapeXMLText, unescapeXMLText };
export const parse = Parser.parse;

// TODO: 导入并导出其他核心功能 (parse, stringify, Parser, escape, etc.)
