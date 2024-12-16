import { Forward } from "./forward";
import type { Plugin } from "../types";
import type { Connection } from "../../connection";
export class XEP0297 extends Forward implements Plugin {
  readonly name = "XEP0297";
  readonly dependencies = ["XEP0030", "XEP0203"] as const;

  readonly connection: Connection;
  constructor(connection: Connection) {
    super();
    this.connection = connection;

    // 检查依赖
    for (const dep of this.dependencies) {
      if (!connection[dep]) {
        console.warn(`${this.name} 需要 ${dep} 插件，现在自动注册`);
        connection.registerPlugin(dep);
      }
    }
  }

  init() {
    this.connection.registerStanzaPlugin("message", (message) => {
      const forward = message.xml.getElementsByTagNameNS(XEP0297.NS, "forwarded")[0];
      if (forward) {
        message.addProperty("forward", forward);
      }
    });

    this.connection.registerEventPlugin("forward", {
      tagName: "message",
      matcher: (message) => {
        return !!(message?.forward);
      },
    });
  }


}

declare module "../../stanza" {
  interface Message {
    /** 由插件XEP0297添加 */
    readonly forward?: Element | null;
  }
}

declare module "../../connection" {
  interface SocketEventMap {
    /** 由插件XEP0297添加 */
    forward?: XEP0297;
  }
}
export default XEP0297;