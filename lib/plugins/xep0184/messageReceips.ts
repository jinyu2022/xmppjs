import { XMPPError } from "@/errors";
import { XMPPElement } from "@/ltx/Element";
export class MessageReceips {
    static readonly NS = "urn:xmpp:receipts" as const;

    static parseReceipts(xml: XMPPElement) {
        if (xml.namespaceURI !== MessageReceips.NS) throw new XMPPError(xml, "不是消息回执命名空间");
        return {
            receipts: {
                id: xml.getAttribute("id"),
                type: xml.tagName as "received" | "request",
            }
        };
    }

    // 重载签名
    static createReceiptsEl(type: "request"): XMPPElement;
    static createReceiptsEl(type: "received", id: string): XMPPElement;
    
    // 实现
    static createReceiptsEl(type: "received" | "request", id?: string): XMPPElement {
        const message = XMPPElement.createElementNS(MessageReceips.NS, type);
        if (type === "received") {
            if (!id) throw new Error("回执请求需要提供消息ID");
            message.setAttribute("id", id);
        }
        return message;
    }
}

declare module "../../stanza" {
    interface Message {
        receipts?: {
            id?: string;
            type: "received" | "request";
        }
    }
}