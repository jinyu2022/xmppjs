import { Connection } from "@/connection";

export interface Plugin {
    readonly connection?: Connection;
    /** 在这里执行初始化，依赖检查等 */
    init(): void;
}
