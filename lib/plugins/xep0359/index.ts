import { StanzaID } from "./stanzaID";
import type { Plugin } from "../types";
import type Connection from "@/connection";
/**
 * XEP-0359: Unique and Stable Stanza IDs  
 * version: 0.7.0 (2023-02-20)
 */
export class XEP0359 extends StanzaID implements Plugin {
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addFeature(StanzaID.NS);
    }

}

export default XEP0359;