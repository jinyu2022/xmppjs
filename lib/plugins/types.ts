import type { Connection } from "@/connection";
import { plugins } from "@/plugins";

/** 实例接口 */
interface PluginInstance {
    /** Connection 类只会自动加载依赖，而不会检查服务器的支持情况。*/
    dependencies?: never;
    readonly connection?: Connection;
    /** 在这里执行初始化，依赖检查等 */
    init(): void;
}

/** 构造函数接口（包含静态属性） */ 
export interface PluginConstructor {
    /** Connection 类只会自动加载依赖，而不会检查服务器的支持情况。*/
    readonly dependencies?: ReadonlyArray<keyof typeof plugins>;
    new (connection: Connection): PluginInstance;
}
// 完整的Plugin类型
export type Plugin = PluginInstance;
