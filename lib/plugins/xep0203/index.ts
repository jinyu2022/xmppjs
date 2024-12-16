import type { Connection } from "../../connection.ts";
import type { Plugin } from "../types.ts";
import { Delay } from "./delay.ts";
export class XEP0203 extends Delay implements Plugin {
    // readonly NS = "urn:xmpp:carbons:2";
    connection= null;
    constructor(_connection: Connection) {
        super();
        // this.connection = connection;
    }

    init() {
        
    }
}

export default XEP0203;