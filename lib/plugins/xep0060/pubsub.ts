import { Iq } from "@/stanza";
import { JID } from "@/JID";
export interface PubsubEventItems<T = "item"|"retract"> {
    node: string;
    retracts: T extends "retract" ? string[] : never;
    item: T extends "item" ? PubsubEventItem : never;
}
export interface PubsubEventItem {
    id?: string;
    publisher?: string;
    // 根据节点的不同，可能有不同的子元素
}
export class Pubsub {
    static readonly NS = {
        BASE: "http://jabber.org/protocol/pubsub",
        EVENT: "http://jabber.org/protocol/pubsub#event",
    } as const;

    /** 构造检索iq
     * @param to 对方jid
     * @param node 节点
     * @param max 最大数量
     * @param id item id
     */
    static createRetrieveItemsIq(to: string | JID, node: string, max?: number, id?: string) {
        const iq = Iq.createIq("get", to);
        const pubsub = iq.createElementNS(Pubsub.NS.BASE, "pubsub");
        const items = iq.createElement("items");
        items.setAttribute("node", node);
        if (max) items.setAttribute("max_items", max.toString());
        if (id) {
            const item = iq.createElement("item");
            item.setAttribute("id", id);
            items.appendChild(item);
        }
        pubsub.appendChild(items);
        iq.documentElement!.appendChild(pubsub);
        return iq.documentElement!;
    }
    static parseEventEl(eventEl: Element) {
        if (eventEl.namespaceURI !== Pubsub.NS.EVENT)
            throw new Error("不是一个event元素");
        if (eventEl.getElementsByTagName("items").length > 0) {
            // 解析item
            const itemsEL = eventEl.getElementsByTagName("items")[0];
            const node = itemsEL.getAttribute("node")!;
            const retract = itemsEL.getElementsByTagName("retract");
            const retracts =
                retract.length > 0
                    ? Array.from(retract).map((retract) => retract.getAttribute("id")!)
                    : void 0;
            const itemELs = itemsEL.getElementsByTagName("item");
            // 最新规范只允许一个item
            const items = Array.from(itemELs).map((itemEL) => {
                const id = itemEL.getAttribute("id") ?? void 0;
                const publisher = itemEL.getAttribute("publisher") ?? void 0;
                // 获取直接子元素
                const children = Array.from(itemEL.childNodes).filter(
                    (child) =>
                        child.nodeType === 1)[0];
                return {
                    id,
                    publisher,
                    [children.nodeName]: children,
                };
            });
            return {
                event: {
                    node,
                    retracts,
                    item: items[0],
                },
            } as Record<"event", PubsubEventItems>;
        }
        // else if (eventEl.getElementsByTagName("collection").length > 0) {
        //     return {
        //         event: {
        //             collection: eventEl.getElementsByTagName("collection")[0],
        //         },
        //     };
        // } else if (eventEl.getElementsByTagName("configuration").length > 0) {
        //     return {
        //         event: {
        //             configuration: eventEl.getElementsByTagName("configuration")[0],
        //         },
        //     };
        // } else if (eventEl.getElementsByTagName("delete").length > 0) {
        //     return {
        //         event: {
        //             delete: eventEl.getElementsByTagName("delete")[0],
        //         },
        //     };
        // } else if (eventEl.getElementsByTagName("purge").length > 0) {
        //     return {
        //         event: {
        //             purge: eventEl.getElementsByTagName("purge")[0],
        //         },
        //     };
        // } else if (eventEl.getElementsByTagName("subscription").length > 0) {
        //     return {
        //         event: {
        //             subscription: eventEl.getElementsByTagName("subscription")[0],
        //         },
        //     };
        // }
    }

    /**
     * 构造发布iq
     * @param publish 发布元素
     */
    static createPublishIq(publish: Element, publishOptions?: Element) {
        const iq = Iq.createIq("set");
        const pubsub = iq.createElementNS(Pubsub.NS.BASE, "pubsub");
        pubsub.appendChild(publish);
        iq.documentElement!.appendChild(pubsub);
        if (publishOptions) pubsub.appendChild(publishOptions);
        return iq.documentElement!;
    }

    /**
     * 构造撤回iq
     */
    static createRetractIq(node: string, id: string, notify?: boolean) {
        const iq = Iq.createIq("set");
        const pubsub = iq.createElementNS(Pubsub.NS.BASE, "pubsub");
        const retract = iq.createElement("retract");
        retract.setAttribute("node", node);
        if (notify) retract.setAttribute("notify", "true");
        const item = iq.createElement("item");
        item.setAttribute("id", id);
        retract.appendChild(item);
        pubsub.appendChild(retract);
        iq.documentElement!.appendChild(pubsub);
        return iq.documentElement!;
    }
}

declare module "@/stanza" {
    interface Message<T extends "item" | "retract" = "item" | "retract"> {
        /**XEP0060 */
        event?: PubsubEventItems<T>;
    }
}
