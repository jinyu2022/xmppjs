import { Iq } from "@/stanza";
import { JID } from "@/JID";
import { XMPPElement } from "@/ltx/Element";
export interface PubsubEventItems {
    node?: string;
    retracts?: string[];
    item?: PubsubEventItem;
    collection?: XMPPElement;
    configuration?: XMPPElement;
    delete?: XMPPElement;
    purge?: XMPPElement;
    subscription?: XMPPElement;
}
export interface PubsubEventItem {
    id?: string;
    publisher?: string;
    // 根据节点的不同，可能有不同的子元素
    [key: string]: unknown;
}
/**
 * XEP-0060: Publish-Subscribe
 * @see https://xmpp.org/extensions/xep-0060.html
 * @version 1.30.0 (2025-11-11)
 */
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
    static createRetrieveItemsIq(
        to: string | JID,
        node: string,
        max?: number,
        id?: string,
    ) {
        const iq = Iq.createIq("get", to);
        const pubsub = XMPPElement.createElementNS(Pubsub.NS.BASE, "pubsub");
        const items = XMPPElement.createElement("items");
        items.setAttribute("node", node);
        if (max) items.setAttribute("max_items", max.toString());
        if (id) {
            const item = XMPPElement.createElement("item");
            item.setAttribute("id", id);
            items.appendChild(item);
        }
        pubsub.appendChild(items);
        iq.appendChild(pubsub);
        return iq;
    }
    static parseEventEl(eventEl: XMPPElement) {
        if (eventEl.namespaceURI !== Pubsub.NS.EVENT)
            throw new Error("不是一个event元素");
        
        const itemsEL = eventEl.getElementsByTagName("items")[0];
        if (itemsEL) {
            // 解析item
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
                const children = itemEL.children.item(0);
                const result: PubsubEventItem = { id, publisher };
                if (children) {
                    result[children.localName] = children;
                }
                return result;
            });
            return {
                event: {
                    node,
                    retracts,
                    item: items[0],
                },
            } as Record<"event", PubsubEventItems>;
        }

        const collectionEL = eventEl.getElementsByTagName("collection")[0];
        if (collectionEL) {
            return {
                event: {
                    node: collectionEL.getAttribute("node") ?? undefined,
                    collection: collectionEL,
                },
            } as Record<"event", PubsubEventItems>;
        }

        const configurationEL = eventEl.getElementsByTagName("configuration")[0];
        if (configurationEL) {
            return {
                event: {
                    node: configurationEL.getAttribute("node") ?? undefined,
                    configuration: configurationEL,
                },
            } as Record<"event", PubsubEventItems>;
        }

        const deleteEL = eventEl.getElementsByTagName("delete")[0];
        if (deleteEL) {
            return {
                event: {
                    node: deleteEL.getAttribute("node") ?? undefined,
                    delete: deleteEL,
                },
            } as Record<"event", PubsubEventItems>;
        }

        const purgeEL = eventEl.getElementsByTagName("purge")[0];
        if (purgeEL) {
            return {
                event: {
                    node: purgeEL.getAttribute("node") ?? undefined,
                    purge: purgeEL,
                },
            } as Record<"event", PubsubEventItems>;
        }

        const subscriptionEL = eventEl.getElementsByTagName("subscription")[0];
        if (subscriptionEL) {
            return {
                event: {
                    node: subscriptionEL.getAttribute("node") ?? undefined,
                    subscription: subscriptionEL,
                },
            } as Record<"event", PubsubEventItems>;
        }

        throw new Error("未知的event元素");
    }

    /**
     * 构造发布iq
     * @param publish 发布元素
     */
    static createPublishIq(publish: XMPPElement, publishOptions?: XMPPElement) {
        const iq = Iq.createIq("set");
        const pubsub = XMPPElement.createElementNS(Pubsub.NS.BASE, "pubsub");
        pubsub.appendChild(publish);
        iq.appendChild(pubsub);
        if (publishOptions) pubsub.appendChild(publishOptions);
        return iq;
    }

    /**
     * 构造撤回iq
     */
    static createRetractIq(node: string, id: string, notify?: boolean) {
        const iq = Iq.createIq("set");
        const pubsub = XMPPElement.createElementNS(Pubsub.NS.BASE, "pubsub");
        const retract = XMPPElement.createElement("retract");
        retract.setAttribute("node", node);
        if (notify) retract.setAttribute("notify", "true");
        const item = XMPPElement.createElement("item");
        item.setAttribute("id", id);
        retract.appendChild(item);
        pubsub.appendChild(retract);
        iq.appendChild(pubsub);
        return iq;
    }
}

declare module "@/stanza" {
    interface Message {
        /**XEP0060 */
        event?: PubsubEventItems;
    }
}
