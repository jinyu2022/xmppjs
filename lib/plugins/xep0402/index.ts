import { Bookmarks } from "./bookmarks";
import type Connection from "@/connection";
import type { Plugin } from "../types";
export default class XEP0402 extends Bookmarks implements Plugin {
    static readonly name = "XEP-0402: PEP Native Bookmarks";
    static readonly dependencies = ["XEP0030","XEP0163"] as const;
    static readonly version = "1.2.0 (2024-08-15)";
    static readonly NS_notify = "urn:xmpp:bookmarks:1+notify";
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addFeature(XEP0402.NS_notify);

    }
}