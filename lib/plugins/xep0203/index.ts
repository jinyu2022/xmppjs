import type { Connection } from "../../connection.ts";
import type { Plugin } from "../types.ts";
import { Delay } from "./delay.ts";
export class XEP0203 extends Delay implements Plugin {
    // readonly NS = "urn:xmpp:carbons:2";
    readonly name = "XEP-0203: Delayed Delivery";
    readonly dependencies = [] as const;
    
    constructor(_connection: Connection) {
        super();
    }

    init() {
        // 不需要检查依赖
        return;
    }
}

export default XEP0203;