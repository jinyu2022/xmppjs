import { Connection } from "../../connection";

export interface Plugin {
    readonly connection: Connection;
    init(): void;
}
