import { Connection } from "../../connection";
import { Message } from "../../stanza";
import type { Plugin } from "../types";
import { Carbons } from "./carbons";
import logger from "@/log";
const log = logger.getLogger("XEP0280");
export class XEP0280 extends Carbons implements Plugin {
  readonly name = "XEP0280";
  static readonly dependencies = ["XEP0030"] as const;
  readonly connection: Connection;
  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }

  init() {
    this.connection.XEP0030!.addFeature(XEP0280.NS);

    this.connection.once("session:start", () => {
      // 查询服务器是否支持
      this.connection.XEP0030!.getServerFeatures().then((features) => {
        // log.debug("服务器支持的特性", features);
        if (features.has(XEP0280.NS)) {
          log.debug("服务器支持 XEP-0280");
          this.enable();
        } else {
          log.warn("服务器不支持 XEP-0280");
        }
      });
    });

    this.connection.registerStanzaPlugin("message", XEP0280.parseCarbonEl);

    this.connection.registerEventPlugin("carbon:received", {
      tagName: "message",
      matcher: (message) => {
        return !!(message?.carbon && message.carbon.type === "received");
      },
    });

    this.connection.registerEventPlugin("carbon:sent", {
      tagName: "message",
      matcher: (message) => {
        return !!(message?.carbon && message.carbon.type === "sent");
      },
    });
  }

  enable() {
    const iq = Carbons.createEnableIq();
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        log.debug("enable 启动成功");
      } else if (result.getAttribute("type") === "error") {
        log.debug("enable failed");
      } else {
        log.error("enable failed");
      }
    });
  }

  disable() {
    const iq = Carbons.createDisableIq();
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        log.debug("disable success");
      } else if (result.getAttribute("type") === "error") {
        log.debug("disable failed");
      } else {
        log.error("disable failed");
      }
    });
  }
}

declare module "../../stanza" {
  interface Message {
    /** 由插件XEP0280添加 */
    readonly carbon?: {
      type: "received" | "sent";
      forwarded: Element;
    };
  }
}

declare module "../../connection" {
  interface SocketEventMap {
    /** 由插件XEP0280添加 */
    "carbon:received": Message;
    /** 由插件XEP0280添加 */
    "carbon:sent": Message;
  }
}

export default XEP0280;
