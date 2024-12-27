import { Iq } from "@/stanza";
export default class Ping {
    static readonly NS = "urn:xmpp:ping" as const;

    static createSendPingIq(to: string) {
        const iq = Iq.createIq("get", to);
        const ping = iq.createElementNS(Ping.NS, "ping");
        iq.documentElement!.appendChild(ping);
        return iq.documentElement!;
    }

    static createPingResultIq(to: string, id: string) {
        const iq = Iq.createIq("result", to);
        iq.documentElement!.setAttribute("id", id);
        return iq.documentElement!;
    }
}