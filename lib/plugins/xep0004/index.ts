import { Form } from './form'
import type { Plugin } from '../types';
import type { Connection } from '../../connection';
export class XEP0004 extends Form implements Plugin {
    readonly name = 'XEP-0004: Data Forms'
    static readonly dependencies = [] as const
    constructor(_connection: Connection) {
        super();
    }

    init() { 
        return
    }
}

export default XEP0004