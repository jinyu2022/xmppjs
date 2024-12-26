import type Connection from "@/connection";
import type { Plugin } from "../types";
import { Nickname } from "./nickname";
class XEP0172 extends Nickname implements Plugin {
    static readonly name = "XEP-0172: User Nickname";
    static readonly dependencies = ["XEP0030"] as const;

    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.registerStanzaPlugin(XEP0172.NS, XEP0172.parseNickEl);
        this.connection.registerEventPlugin("pep:nickname",{
            tagName: "message",
            matcher: (message) => {
                return message.event?.node === XEP0172.NS;
            }
        })
    }
}

import type { Message } from "@/stanza";
declare module "@/stanza" {
    interface Message {
        nick?: string;
    }
}
declare module "@/connection" {
    interface SocketEventMap {
        "pep:nickname"?: Message;
    }
}
export default XEP0172;