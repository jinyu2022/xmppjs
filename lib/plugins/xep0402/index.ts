import { Bookmarks } from "./bookmarks";
import logger from "@/log";
import type Connection from "@/connection";
import type { Plugin } from "../types";
import { XMPPError } from "@/errors";
import type { Conference } from "./bookmarks";
const log = logger.getLogger("XEP0402");
/**
 * XEP-0402: PEP Native Bookmarks 插件实现  
 * version: 1.2.0 (2024-08-15);
 */
export default class XEP0402 extends Bookmarks implements Plugin {
    static readonly dependencies = ["XEP0030", "XEP0163"] as const;
    static readonly NS_notify = "urn:xmpp:bookmarks:1+notify";
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addFeature(XEP0402.NS_notify);
        this.connection.registerStanzaPlugin(XEP0402.NS, XEP0402.pareseConferenceEl);
        this.connection.registerEventPlugin("bookmark:updata", {
            "tagName": "message",
            "matcher": (message) => 
                message.event?.node === Bookmarks.NS && message.event?.item?.conference != null
        });

        this.connection.registerEventPlugin("bookmark:delete", {
            "tagName": "message",
            "matcher": (message) => 
                message.event?.node === Bookmarks.NS && message.event?.retracts != null
        });
    }


    /**
     * 检索所有书签
     * @returns 书签列表
     * @throws {XMPPError} 检索书签失败
     */
    async retrieveBookmarks() {
        const iq = Bookmarks.createRetrieveBookmarksIq(this.connection.jid.bare);
        const resIq = await this.connection.sendAsync(iq);
        if (resIq.getAttribute('type') === "error") {
            throw new XMPPError(resIq, '检索书签失败')
        }
        const bookmarks = Bookmarks.parseBookmarksIq(resIq);
        return bookmarks;

    }

    async addBookmark(conference: Conference & { jid: string }) {
        const iq = XEP0402.createAddBookmarkIq(conference);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute('type') === "error") {
            throw new XMPPError(res, '添加书签失败')
        }
    }

    /**
     * 编辑书签意味着将具有相同书签 JID 作为 id 的项目重新发布
     */
    async editBookmark(conference: Conference & { jid: string }) {
        const iq = XEP0402.createAddBookmarkIq(conference);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute('type') === "error") {
            throw new XMPPError(res, '编辑书签失败')
        }
    }

    /**
     * 删除书签意味着撤回由书签的 JID 标识的现有项目
     */
    async deleteBookmark(jid: string) {
        const retract = XEP0402.createDeleteBookmarkIq(jid);
        const res = await this.connection.sendAsync(retract);
        if (res.getAttribute('type') === "error") {
            throw new XMPPError(res, '删除书签失败')
        }
    }
}

declare module "@/plugins/xep0060/pubsub" {
    export interface PubsubEventItem{
        /** XEP0402 */
        conference?: Conference;
    }
}

import type { Message } from "@/stanza";
declare module "@/connection" {
    interface SocketEventMap {
        /** XEP0402 */
        "bookmark:updata": Message<"item">;
        /** XEP0402 */
        "bookmark:delete": Message<"retract">;
    }
}