import { XMPPError } from "@/errors";

interface StableStanzaID {
    id: string;
    by?: string;
}

export class StanzaID {
    static readonly NS = "urn:xmpp:sid:0" as const;

    static parseStanzaId(
        stanza: Element
    ): Record<"stanzaID" | "originID" | "referencedStanza", StableStanzaID> {
        if (stanza.namespaceURI !== StanzaID.NS)
            throw new XMPPError(stanza, "不是stanzaId命名空间");

        const tagNameMap = {
            "stanza-id": "stanzaID",
            "origin-id": "originID",
            "referenced-stanza": "referencedStanza",
        } as const;

        const tagName = tagNameMap[stanza.tagName as keyof typeof tagNameMap];
        const result = {} as StableStanzaID;
        result.id = stanza.getAttribute("id")!;
        const by = stanza.getAttribute("by");
        if (by) result.by = by;
        return {
            [tagName]: result,
        } as Record<"stanzaID" | "originID" | "referencedStanza", StableStanzaID>;
    }
}
