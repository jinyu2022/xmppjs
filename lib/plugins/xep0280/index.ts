import { Connection } from "../../connection";
import { Message } from "../../stanza";
import type { Plugin } from "../types";
import { Carbons } from "./carbons";
export class XEP0280 extends Carbons implements Plugin {
  readonly name = "XEP0280";
  readonly dependencies = ["XEP0030"] as const;
  readonly connection: Connection;
  constructor(connection: Connection) {
    super(connection);
    this.connection = connection;
  }

  init() {
    // 检查依赖
    for (const dep of this.dependencies) {
      if (!this.connection[dep]) {
        console.warn(`Carbons 需要 ${dep} 插件，现在自动注册`);
        this.connection.registerPlugin(dep);
      }
    }
    this.connection.XEP0030!.addFeature(XEP0280.NS);
    
    this.connection.once("session:start", () => {
      // 查询服务器是否支持
      this.connection
        .XEP0030!.getDiscoInfo(this.connection.jid.domain)
        .then((iq) => {
          const query = iq.getElementsByTagNameNS(
            this.connection.XEP0030!.NS.DISCO_INFO,
            "query"
          )[0];
          if (!query) throw new Error("查询disco#info失败");

          const features = query.getElementsByTagName("feature");
          const hasFeature = Array.from(features).some(
            (feature) => feature.getAttribute("var") === XEP0280.NS
          );
          if (hasFeature) {
            console.log("服务器支持 XEP-0280");
            this.enable();
          } else {
            console.warn("服务器不支持 XEP-0280");
          }
        });
    });

    this.connection.registerStanzaPlugin('message',XEP0280.parseCarbonEl)

    this.connection.registerEventPlugin('carbon:received', {
      tagName: 'message',
      matcher:(message) => {
        return !!(message?.carbon && message.carbon.type === 'received');
      },
    })

    this.connection.registerEventPlugin('carbon:sent',{
      tagName: 'message',
      matcher:(message) => {
        return !!(message?.carbon && message.carbon.type === 'sent');
      }
    })
  }
}

declare module "../../stanza" {
  interface Message {
    /** 由插件XEP0280添加 */
    readonly carbon?: {
      type: 'received'| 'sent';
      forwarded: Element;
    }
  }
}

declare module "../../connection" {
  interface SocketEventMap {
    /** 由插件XEP0280添加 */
    "carbon:received": Message
    /** 由插件XEP0280添加 */
    "carbon:sent": Message
  }
}

export default XEP0280;