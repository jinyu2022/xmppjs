import { Forward } from "./forward";
import type { Plugin } from "../types";
import type { Connection } from "../../connection";
export class XEP0297 extends Forward implements Plugin {
  readonly name = "XEP0297";
  static readonly dependencies = ["XEP0030", "XEP0203"] as const;

  readonly connection: Connection;
  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }

  init() {
    this.connection.registerStanzaPlugin(XEP0297.NS, XEP0297.parseForwardedEl);

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
import type { Message } from "../../stanza";
declare module "../../connection" {
  
  interface SocketEventMap {
    /** 由插件XEP0297添加 */
    forward?: Message;
  }
}
export default XEP0297;