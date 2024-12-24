import type { Connection } from "@/connection";
import type { plugins } from "@/plugins";

/** 实例接口 */
interface PluginInstance {
    readonly dependencies?: never;
    readonly connection?: Connection;
    /** 在这里执行初始化，依赖检查等 */
    init(): void;
}

/** 构造函数接口（包含静态属性） */ 
export interface PluginConstructor {
    readonly dependencies?: ReadonlyArray<keyof typeof plugins>;
    new (connection: Connection): PluginInstance;
}
// 完整的Plugin类型
export type Plugin = PluginInstance;
