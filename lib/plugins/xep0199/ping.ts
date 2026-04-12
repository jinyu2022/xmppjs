import { Iq } from "@/stanza";
import { XMPPElement } from "@/ltx";
export default class Ping {
    static readonly NS = "urn:xmpp:ping" as const;

    static createSendPingIq(to: string) {
        const iq = Iq.createIq("get", to);
        const ping = XMPPElement.createElementNS(Ping.NS, "ping");
        iq.appendChild(ping);
        return iq;
    }

    static createPingResultIq(to: string, id: string) {
        const iq = Iq.createIq("result", to);
        iq.setAttribute("id", id);
        return iq;
    }
}