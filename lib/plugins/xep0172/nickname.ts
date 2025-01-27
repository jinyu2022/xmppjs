import { implementation } from "@/shims";
import { PEP } from "../xep0163/pep";
export class Nickname {
    static readonly NS = "http://jabber.org/protocol/nick" as const;

    static parseNickEl(nick: Element) {
        if (nick.namespaceURI !== Nickname.NS) throw new Error("不是一个nick元素");
        return {
            nick: nick.textContent,
        };
    }

    static createNickSubscribe(to: string, nick: string) {
        const pres = implementation.createDocument("jabber:client", "presence", null);
        pres.documentElement!.setAttribute("to", to);
        const nickEl = pres.createElementNS(Nickname.NS, "nick");
        nickEl.textContent = nick;
        pres.documentElement!.appendChild(nickEl);
        return pres.documentElement!;
    }

    static createNickMessage(to: string,message:string, nick: string) {
        const msg = implementation.createDocument("jabber:client", "message", null);
        msg.documentElement!.setAttribute("to", to);
        msg.documentElement!.setAttribute("type", 'chat');
        const body = msg.createElement('body');
        body.textContent = message;
        msg.documentElement!.appendChild(body);
        const nickEl = msg.createElementNS(Nickname.NS, "nick");
        nickEl.textContent = nick;
        msg.documentElement!.appendChild(nickEl);
        return msg.documentElement
    }

    /**
     * 创建发布昵称的iq
     * @param nick 昵称
     */
    static createNickPublishIq(nick: string) {
        const publishDoc = implementation.createDocument(null, "publish", null);
        const publish = publishDoc.documentElement!;
        publish.setAttribute("node", Nickname.NS);
        const item = publishDoc.createElement("item");
        const nickEl = publishDoc.createElementNS(Nickname.NS, "nick");
        nickEl.textContent = nick;
        item.appendChild(nickEl);
        publish.appendChild(item);
        return PEP.createPublishIq(publish);
    }

    /**
     * 创建获取昵称的iq
     * 
     */
    static createRetrieveNickIq(jid: string) {
        return PEP.createRetrieveItemsIq(jid, Nickname.NS, 1);
    }
    //不打算支持回退到0060

}
