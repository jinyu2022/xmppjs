import { Client } from "./client";
import XEP0077 from "./plugins/xep0077";
import { Element as E } from '@xmldom/xmldom';

if (typeof Element === 'undefined') {
    globalThis.Element = E;
}
export { Client, XEP0077 };