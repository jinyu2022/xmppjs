import { EntityCaps } from "./entityCaps";
import type Connection from "@/connection";
import type { Plugin } from "../types";
// TODO: 准备一个文件，内置部分能力与哈希值的映射
export default class XEP0115 extends EntityCaps implements Plugin {
    static readonly name = "XEP-0115: Entity Capabilities";
    static readonly version = "1.6.0 (2022-03-08)";
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;
    private selfCaps?: Element
    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.registerStanzaPlugin(EntityCaps.NS, EntityCaps.parseCaps);

        this.connection.registerInterceptor("send", (stanza) => {
            if (stanza.tagName === "presence" && this.selfCaps) {
                stanza.appendChild(this.selfCaps);
            }
            return stanza; 
        });

        this.connection.on("presence", (presence) => {
            // TODO: 通过ver查找文件中对应的实体能力，然后加入到discos中
        });

        this.connection.once("connect", async () => {
            const identities  = this.connection.XEP0030!.identities;
            const features = [...this.connection.XEP0030!.features];
            const ver = await EntityCaps.generateCapsVerification(identities, features);
            this.selfCaps = EntityCaps.createCapsElement({
                node: "http://lekexmpp.chat",
                ver,
                hash: "sha-1"
            });
        })
    }
}