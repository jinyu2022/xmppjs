import type Connection from "@/connection";
import type { Plugin } from "../types";
import {PEP} from "./pep";
export class XEP0163 extends PEP implements Plugin {
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.getServerIdentities().then((identities) => {
            if (
                !identities.some(
                    (identity) => identity.type === "pep" && identity.category === "pubsub"
                )
            ) {
                this.connection.deregisterPlugin('XEP0163')
                console.error("服务器不支持XEP-0163");
            }
        });
    }
}

export default XEP0163;