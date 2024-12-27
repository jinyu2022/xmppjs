import { Avatar } from "./avatar";
import { PEP } from "../xep0163/pep";
import type Connection from "@/connection";
import { XMPPError } from "@/errors";
import type { Plugin } from "../types";
import type { JID } from "@/JID";

export class XEP0084 extends Avatar implements Plugin {
    static readonly name = "XEP-0084: User Avatar";
    static readonly dependencies = ["XEP0030"] as const;
    static readonly version = "1.1.4 (2019-09-20)";
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addItem(this.connection.jid.bare, XEP0084.NS.metadata);
        this.connection.XEP0030!.addItem(this.connection.jid.bare, XEP0084.NS.metadata);
        this.connection.registerStanzaPlugin(
            XEP0084.NS.metadata,
            XEP0084.parseMetadataEl
        );
        this.connection.registerEventPlugin("pep:avatar", {
            tagName: "message",
            matcher: (message) => {
                return message.event?.node === XEP0084.NS.metadata;
            },
        });
    }

    /**
     * 通过jid获取头像数据
     * @param jid 对方的JID
     * @param metadata 头像元数据
     * @returns 头像数据base64
     */
    async getAvatarData(
        jid: JID | string,
        metadata?: AvatarMetadata
    ): Promise<AvatarMetadata & { data?: string; }> {
        // NOTE: 其实不需要metadata ID也可以获取到头像数据，但是规范要求通过id获取
        if (!metadata) {
            // 先获取元数据
            const getMetaDataIq = PEP.createRetrieveItemsIq(
                jid,
                XEP0084.NS.metadata,
                1
            );
            const res = await this.connection.sendAsync(getMetaDataIq);

            if (res.getAttribute("type") === "error")
                throw new XMPPError(res, "获取头像元数据失败");

            const metadataEL = res.getElementsByTagNameNS(
                XEP0084.NS.metadata,
                "metadata"
            )[0];
            metadata = XEP0084.parseMetadataEl(metadataEL).metadata;
        }

        const iq = PEP.createRetrieveItemsIq(jid, XEP0084.NS.data, 1, metadata.id);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute("type") === "error")
            throw new XMPPError(res, "获取头像元数据失败");

        const dataEl = res.getElementsByTagNameNS(XEP0084.NS.data, "data")[0];
        return {
            ...metadata,
            data: dataEl.textContent ?? void 0,
        };
    }

    /**
     * 发布头像数据
     * @param img 头像数据或地址
     */
    async publishAvatarData(img: string | File) {
        const [publishDataIq, publishMetadataIq] = await XEP0084.createDataPublishIq(img);
        const dataRes = await this.connection.sendAsync(publishDataIq);
        if (dataRes.getAttribute("type") === "error")
            throw new XMPPError(dataRes, "发布头像数据失败");

        const metaRes =  await this.connection.sendAsync(publishMetadataIq);
        if (metaRes.getAttribute("type") === "error")
            throw new XMPPError(metaRes, "发布头像元数据失败");
    }
}
import type { Message } from "@/stanza";
declare module "@/connection" {
    interface SocketEventMap {
        "pep:avatar"?: Message;
    }
}
import type { AvatarMetadata } from "./avatar";

declare module "../xep0060/pubsub" {
    interface PubsubEventItem {
        /** XEP0084添加 */
        metadata: AvatarMetadata;
    }
}
// declare module "@/stanza" {
//     interface Message {
//         event?: PubsubEventItems | AvatarEventItem; // 允许 event 是 PubsubEventItems 或 AvatarEventItem
//     }
// }
// declare module "@/stanza" {
//     interface Message {
//         event?: {
//             node: string;
//             retracts?: string[];
//             item: {
//                 id?: string;
//                 publisher?: string;
//                 // [key: string]: Element | string | Record<string, unknown> |undefined;
//             } &  {
//                 [key: string]: Element | string | Record<string, unknown> |undefined;
//                 aaa: string;
//             }
//         }
//     }
// }
export default XEP0084;
