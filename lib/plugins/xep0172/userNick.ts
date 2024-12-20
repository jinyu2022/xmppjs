import { implementation } from "@/shims";
export class UserNick {
    static readonly NS = "http://jabber.org/protocol/nick" as const;

    static parseNickEl(nick: Element) {
        if (nick.namespaceURI !== UserNick.NS) throw new Error("不是一个nick元素");
        return {
            nick: nick.textContent,
        };
    }

    static createNickSubscribe(to: string, nick: string) {
        const pres = implementation.createDocument("jabber:client", "presence", null);
        pres.documentElement!.setAttribute("to", to);
        const nickEl = pres.createElementNS(UserNick.NS, "nick");
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
        const nickEl = msg.createElementNS(UserNick.NS, "nick");
        nickEl.textContent = nick;
        msg.documentElement!.appendChild(nickEl);
        return msg.documentElement
    }

    //todo: 4.3昵称管理
}
