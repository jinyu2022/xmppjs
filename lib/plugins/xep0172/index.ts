import type Connection from "@/connection";
import type { Plugin } from "../types";
import { Nickname } from "./nickname";

/**
 * XEP-0172: User Nickname
 * version: 1.1 (2012-03-21)
 */
class XEP0172 extends Nickname implements Plugin {
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

    /**
     * 检索用户昵称
     * @param jid 要检索的用户的JID 
     * @returns 昵称
     * @throws {XMPPError} 如果检索失败
     */
    async retrieveNick(jid: string) {
        const iq = XEP0172.createRetrieveNickIq(jid);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute("type") === "error" )
            throw new XMPPError(res, "获取昵称失败")
        const nickEL = res.getElementsByTagNameNS(XEP0172.NS, "nick")[0]
        return nickEL.textContent!
    }
}

import type { Message } from "@/stanza";
import { XMPPError } from "@/errors";
declare module "../../stanza" {
    interface Message {
        nick?: string;
    }

    interface Presence {
        nick?: string;
    }
}
declare module "../../connection" {
    interface SocketEventMap {
        "pep:nickname"?: Message;
    }
}
export default XEP0172;