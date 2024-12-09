import { Connection } from "../../connection";
import type { Plugin } from "../types";
import { Carbons } from "./carbons";
export class XEP0280 extends Carbons implements Plugin {
  readonly name = "XEP0280";
  readonly dependencies = ["XEP0030"] as const;
  connection: Connection;
  constructor(connection: Connection) {
    super(connection);
    // 检查依赖
    for (const dep of this.dependencies) {
      if (!connection[dep]) {
        console.warn(`Carbons 需要 ${dep} 插件，现在自动注册`);
        connection.registerPlugin(dep);
      }
    }
    this.connection = connection;
    this.connection.XEP0030!.addFeature(this.NS);
  }

  init() {
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
            (feature) => feature.getAttribute("var") === this.NS
          );
          if (hasFeature) {
            console.log("服务器支持 XEP-0280");
            this.enable();
          } else {
            console.warn("服务器不支持 XEP-0280");
          }
        });
    });
  }
}

export default XEP0280;