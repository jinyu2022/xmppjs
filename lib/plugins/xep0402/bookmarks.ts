import { PEP } from "../xep0163/pep";
import type { JID } from "@/JID";
import { XMPPElement } from "@/ltx/Element";

/**
 * @see https://xmpp.org/extensions/xep-0402.html#table-1
 */
export interface Conference {
    /** 用户指定的群聊名称（备注）。客户端不应尝试从JID自动生成该信息。 */
    name?: string;
    /** 客户端登录时是否应该自动加入会议室。默认为false */
    autojoin?: boolean;
    /** 用户指定的群昵称，若无指定则使用XEP-0172指定的昵称 */
    nick?: string;
    /** 房间密码 */
    password?: string;
    /** 一组子元素（可能属于任意命名空间）。客户端在编辑项目时必须保留这些（尤其是保留未知元素）。 */
    extensions?: XMPPElement;
    /** 房间的jid */
    jid: string;
}

export class Bookmarks {
    static readonly NS = "urn:xmpp:bookmarks:1";

    /**
     * 检索所有书签
     */
    static createRetrieveBookmarksIq(to: string | JID) {
        return PEP.createRetrieveItemsIq(to, Bookmarks.NS);
    }

    static parseBookmarksIq(iq: XMPPElement): Conference[] {
        const item = iq.getElementsByTagName("item");
        return Array.from(item).map((item) => {
            const conferenceEl = item.getElementsByTagName("conference")[0];
            return {
                ...Bookmarks.pareseConferenceEl(conferenceEl).conference,
                // XEP-0402 书签的 JID 是 item 的 id 属性，conference不再包含jid属性
                jid: item.getAttribute("id")!,
            };
        });
    }

    static parseBookmarksEvent(eventEl: XMPPElement) {
        if (eventEl.namespaceURI !== Bookmarks.NS)
            throw new Error("不是一个bookmarks event元素");
        const itemsEL = eventEl.getElementsByTagName("items")[0];
        const itemELs = itemsEL.getElementsByTagName("item");
        const items = Array.from(itemELs).map((itemEL) => {
            const jid = itemEL.getAttribute("id")!;
            const conference = itemEL.getElementsByTagName("conference")[0];
            const name = conference.getAttribute("name") ?? void 0;
            const autojoin = conference.getAttribute("autojoin") === "true";
            const nick =
                conference.getElementsByTagName("nick")[0].textContent ?? void 0;
            const password =
                conference.getElementsByTagName("password")[0].textContent ?? void 0;
            const extensions = conference.getElementsByTagName("extensions")[0];
            return { jid, name, autojoin, nick, password, extensions };
        });
        return items;
    }

    static pareseConferenceEl(
        conferenceEl: XMPPElement
    ): Record<"conference", Omit<Conference, "jid">> {
        if (
            conferenceEl.namespaceURI !== Bookmarks.NS &&
            conferenceEl.tagName !== "conference"
        )
            throw new Error("不是一个conference元素");
        // const jid = conferenceEl.getAttribute("jid") ?? void 0;
        const name = conferenceEl.getAttribute("name") ?? void 0;
        const autojoin = conferenceEl.getAttribute("autojoin") === "true";
        const nick =
            conferenceEl.getElementsByTagName("nick")[0]?.textContent ?? void 0;
        const password =
            conferenceEl.getElementsByTagName("password")[0]?.textContent ?? void 0;
        const extensions = conferenceEl.getElementsByTagName("extensions")[0];
        return { conference: { name, autojoin, nick, password, extensions } };
    }
    /**
     * 添加书签就是发布新节点
     * @param conference
     * @returns
     */
    static createAddBookmarkIq(conference: Conference & { jid: string; }) {
        const { jid, name, autojoin, nick, password, extensions } = conference;
        const publish = XMPPElement.createElement("publish");
        publish.setAttribute("node", Bookmarks.NS);
        const item = XMPPElement.createElement("item");
        item.setAttribute("id", jid);
        const conferenceEl = XMPPElement.createElement("conference");
        if (name) conferenceEl.setAttribute("name", name);
        if (autojoin) conferenceEl.setAttribute("autojoin", "true");
        if (nick) {
            const nickEl = XMPPElement.createElement("nick");
            nickEl.textContent = nick;
            conferenceEl.appendChild(nickEl);
        }
        if (password) {
            const passwordEl = XMPPElement.createElement("password");
            passwordEl.textContent = password;
            conferenceEl.appendChild(passwordEl);
        }
        if (extensions) conferenceEl.appendChild(extensions);
        item.appendChild(conferenceEl);
        publish.appendChild(item);
        return PEP.createPublishIq(publish);
    }

    /**
     * 删除书签意味着撤回由书签的 JID 标识的现有项目
     */
    static createDeleteBookmarkIq(jid: string) {
        const retract = PEP.createRetractIq(Bookmarks.NS, jid, true);
        return retract;
    }
}
