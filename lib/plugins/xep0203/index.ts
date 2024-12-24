import type { Connection } from "../../connection.ts";
import type { Plugin } from "../types.ts";
import { Delay } from "./delay.ts";
export class XEP0203 extends Delay implements Plugin {
    // readonly NS = "urn:xmpp:carbons:2";
    readonly name = "XEP-0203: Delayed Delivery";
    readonly connection?: Connection;
    constructor(_connection: Connection) {
        super();
    }

    init() {
        this.connection?.registerStanzaPlugin(XEP0203.NS, XEP0203.parseDelayEl);
    }
}

export default XEP0203;