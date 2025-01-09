import { XMPPError } from "@/errors";
import { implementation } from "@/shims";
export class MessageReceips {
    static readonly NS = "urn:xmpp:receipts" as const;

    static parseReceipts(xml: Element) {
        if (xml.namespaceURI !== MessageReceips.NS) throw new XMPPError(xml, "不是消息回执命名空间");
        return {
            receipts: {
                id: xml.getAttribute("id"),
                type: xml.tagName as "received" | "request",
            }
        };
    }

    static createReceiptsEl(type: "received" | "request", id?: string) {
        const message = implementation.createDocument(MessageReceips.NS, type).documentElement!;
        if (id) message.setAttribute("id", id);
        return message;
    }
}

declare module "@/stanza" {
    interface Message {
        receipts?: {
            id?: string;
            type: "received" | "request";
        }
    }
}