import { Form } from './form'
import type { Plugin } from '../types';
export class XEP0004 extends Form implements Plugin {
    /** 你不应该使用这个 */
    connection = null
    constructor(_connection: any) {
        super();
    }

    init() { return }
}

export default XEP0004