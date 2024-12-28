import { PEP } from "../xep0163/pep";
import type { JID } from "@/JID";
interface Conference {
    jid: string;
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
            const jid = item.getAttribute("id")!;
            const name = conference.getAttribute("name") ?? void 0;
            const autojoin = conference.getAttribute("autojoin") === "true";
            const nick = conference.getElementsByTagName("nick")[0].textContent ?? void 0;
            const password = conference.getElementsByTagName("password")[0].textContent ?? void 0;
            const extensions = conference.getElementsByTagName("extensions")[0];
            return { jid, name, autojoin, nick, password, extensions };
        });
    }
}
