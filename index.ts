import {Client} from './lib/client';
import XEP0077 from './lib/plugins/xep0077';
import { XEP0392 } from '@/plugins/xep0392';
import { Element as E } from '@xmldom/xmldom';

if (typeof Element === 'undefined') {
    globalThis.Element = E;
}
export {XEP0077, Client, XEP0392};