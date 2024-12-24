import { Iq } from "@/stanza";

export interface PubsubEventItems {
    node: string;
    retracts?: string[];
    item: Element;
}

export class Pubsub {
    static readonly NS = {
        BASE: "http://jabber.org/protocol/pubsub",
        EVENT: "http://jabber.org/protocol/pubsub#event",
    } as const;

    static parseEventEl(eventEl: Element) {
        if (eventEl.namespaceURI !== Pubsub.NS.EVENT)
            throw new Error("不是一个event元素");
        if (eventEl.getElementsByTagName("items").length > 0) {
            // 解析item
            const items = eventEl.getElementsByTagName("items")[0];
            const node = items.getAttribute("node")!;
            const retract = items.getElementsByTagName("retract");
            const retracts =
                retract.length > 0
                    ? Array.from(retract).map((retract) => retract.getAttribute("id")!)
                    : void 0;
            const item = items.getElementsByTagName("item")[0];
            return {
                event: {
                    node,
                    retracts,
                    item,
                },
            };
        } else if (eventEl.getElementsByTagName("collection").length > 0) {
            return {
                event: {
                    collection: eventEl.getElementsByTagName("collection")[0],
                },
            };
        } else if (eventEl.getElementsByTagName("configuration").length > 0) {
            return {
                event: {
                    configuration: eventEl.getElementsByTagName("configuration")[0],
                },
            };
        } else if (eventEl.getElementsByTagName("delete").length > 0) {
            return {
                event: {
                    delete: eventEl.getElementsByTagName("delete")[0],
                },
            };
        } else if (eventEl.getElementsByTagName("purge").length > 0) {
            return {
                event: {
                    purge: eventEl.getElementsByTagName("purge")[0],
                },
            };
        } else if (eventEl.getElementsByTagName("subscription").length > 0) {
            return {
                event: {
                    subscription: eventEl.getElementsByTagName("subscription")[0],
                },
            };
        }
    }

    static createPublishIq(publish: Element) {
        const iq = Iq.createIq("set");
        const pubsub = iq.createElementNS(Pubsub.NS.BASE, "pubsub");
        pubsub.appendChild(publish);
        iq.documentElement!.appendChild(pubsub);
        return iq.documentElement!;
    }
}

declare module "@/stanza" {
    interface Message {
        /**XEP0060 */
        event?:
        {
            node: string;
            retracts: string[];
            item: Element;
        }
    }
}
