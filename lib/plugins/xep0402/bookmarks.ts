import { PEP } from "../xep0163/pep";
import { Iq } from "@/stanza";
import { implementation } from "@/shims";
import type { JID } from "@/JID";
export interface Conference {
    name?: string;
    autojoin?: boolean;
    nick?: string;
    password?: string;
    extensions?: Element;
}

export class Bookmarks {
    static readonly NS = "urn:xmpp:bookmarks:1";

    /**
     * 检索所有书签
     */
    static createRetrieveBookmarksIq(to: string | JID) {
        return PEP.createRetrieveItemsIq(to, Bookmarks.NS);
    }

    static parseBookmarksIq(iq: Element): Conference[] {
        const item = iq.getElementsByTagName("item");
        return Array.from(item).map((item) => {
            const conference = item.getElementsByTagName("conference")[0];
            return Bookmarks.pareseConferenceEl(conference).conference;
        });
    }

    static parseBookmarksEvent(eventEl: Element) {
        if (eventEl.namespaceURI !== Bookmarks.NS)
            throw new Error("不是一个bookmarks event元素");
        const itemsEL = eventEl.getElementsByTagName("items")[0];
        const itemELs = itemsEL.getElementsByTagName("item");
        const items = Array.from(itemELs).map((itemEL) => {
            const jid = itemEL.getAttribute("id")!;
            const conference = itemEL.getElementsByTagName("conference")[0];
            const name = conference.getAttribute("name") ?? void 0;
            const autojoin = conference.getAttribute("autojoin") === "true";
            const nick = conference.getElementsByTagName("nick")[0].textContent ?? void 0;
            const password = conference.getElementsByTagName("password")[0].textContent ?? void 0;
            const extensions = conference.getElementsByTagName("extensions")[0];
            return { jid, name, autojoin, nick, password, extensions };
        });
        return items;
    }

    static pareseConferenceEl(conferenceEl: Element): Record<"conference", Conference> {
        if (conferenceEl.namespaceURI !== Bookmarks.NS && conferenceEl.tagName !== "conference")
            throw new Error("不是一个conference元素");
        // const jid = conferenceEl.getAttribute("jid") ?? void 0;
        const name = conferenceEl.getAttribute("name") ?? void 0;
        const autojoin = conferenceEl.getAttribute("autojoin") === "true";
        const nick = conferenceEl.getElementsByTagName("nick")[0]?.textContent ?? void 0;
        const password = conferenceEl.getElementsByTagName("password")[0]?.textContent ?? void 0;
        const extensions = conferenceEl.getElementsByTagName("extensions")[0];
        return { "conference": {name, autojoin, nick, password, extensions } };
    }
    /**
     * 添加书签就是发布新节点
     * @param conference 
     * @returns 
     */
    static createAddBookmarkIq(conference: Conference & { jid: string }) {
        const { jid, name, autojoin, nick, password, extensions } = conference;
        const publish = implementation.createDocument(null, "publish", null);
        publish.documentElement!.setAttribute("node", Bookmarks.NS);
        const item = publish.createElement("item");
        item.setAttribute("id", jid);
        const conferenceEl = publish.createElement("conference");
        if (name) conferenceEl.setAttribute("name", name);
        if (autojoin) conferenceEl.setAttribute("autojoin", "true");
        if (nick) {
            const nickEl = publish.createElement("nick");
            nickEl.textContent = nick;
            conferenceEl.appendChild(nickEl);
        }
        if (password) {
            const passwordEl = publish.createElement("password");
            passwordEl.textContent = password;
            conferenceEl.appendChild(passwordEl);
        }
        if (extensions) conferenceEl.appendChild(extensions);
        item.appendChild(conferenceEl);
        publish.documentElement!.appendChild(item);
        return PEP.createPublishIq(publish.documentElement!);
    }

    /**
     * 删除书签意味着撤回由书签的 JID 标识的现有项目
     */
    static createDeleteBookmarkIq(jid: string) {
        const retract = PEP.createRetractIq(Bookmarks.NS, jid, true);
        return retract;
    }
}
