import type Connection from "@/connection";
import type { JID } from "@/JID";
import type { Message } from "@/stanza";
import type { Plugin } from "../types";
import {
    Retraction,
    type MessageType
} from "./retraction";


/**
 * XEP-0424: Message Retraction
 * @see https://xmpp.org/extensions/xep-0424.html
 * @version 0.4.2 (2025-01-18)
 */
export class XEP0424 extends Retraction implements Plugin {
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addFeature(Retraction.NS);
        this.connection.registerStanzaPlugin(Retraction.NS, Retraction.parseRetractionEl);

        this.connection.registerEventPlugin("message:retract", {
            tagName: "message",
            matcher: (message) => message.retract != null,
        });
    }

    /**
     * 发送消息撤回请求
     * @param to 消息接收者的 JID（裸 JID 或完整 JID）
     * @param id 要撤回的消息的唯一标识符
     * @param options 可选参数，包括消息类型和回退文本
     */
    retract(to: string | JID, id: string, msgType: MessageType = "chat", fallbackText?: string) {
        const message = XEP0424.createRetractionMessage(
            to,
            id,
            msgType,
            fallbackText,
        );
        this.connection.send(message);
        return message;
    }
}

declare module "@/stanza" {
    interface Message {
        /** XEP0424: 请求消息撤回 */
        retract?: { id: string };
        /** XEP0424: 撤回标记 */
        retracted?: { id: string; stamp?: Date };
    }
}

declare module "@/connection" {
    interface SocketEventMap {
        /** XEP0424 请求消息撤回*/
        "message:retract": Message & { retract: { id: string } };
    }
}

export default XEP0424;
