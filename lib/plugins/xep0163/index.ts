import type Connection from "@/connection";
import type { Plugin } from "../types";
import {PEP} from "./pep";
export class XEP0163 extends PEP implements Plugin {
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
    }
}