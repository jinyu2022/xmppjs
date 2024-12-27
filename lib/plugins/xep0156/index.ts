import { Connection } from "../../connection";
import { Plugin } from "../types";
import { discoverAltXMPP } from "./discoverAltXMPP";
import logger from "@/log";
const log = logger.getLogger("XEP0156");
class XEP0156 implements Plugin {
  readonly name = "XEP-0156: Discovering Alternative XMPP Connection Methods";
  readonly connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  init() {
    // 如果已经有service，就不需要再初始化
    if (this.connection.url) {
      log.debug("已经有url，不需要再初始化");
      return;
    }else if (!this.connection.socket){
      log.debug("未连接，不需要初始化");
      return;
    }else if (!this.connection.protocol){
      log.debug("未指定协议，不需要再初始化");
      return;
    }else if (this.connection.protocol === "xmpp"){
      log.debug("xmpp协议，不需要再初始化");
      return;
    }
    // 获取连接方法
    return discoverAltXMPP(this.connection.jid.domain)
      .then((result) => {
        let urlStr;
        if (this.connection.protocol == "ws") {
          urlStr = result["websocket"];
        } else if (this.connection.protocol == "http") {
          urlStr = result["xbosh"];
        }else {
          throw new Error(`未找到协议 ${this.connection.protocol} 的连接方法`);
        }
        if (!urlStr) {
          throw new Error("未找到连接方法");
        }
        const url = new URL(urlStr);
        this.connection.address = url.hostname;
        this.connection.port = url.port;
        this.connection.path = url.pathname;
        if (this.connection.tls) {
          // 如果是tls协议，就用wss/https
          this.connection.url =  urlStr.replace("ws://", "wss://").replace("http://", "https://");
        }else{
          // 如果不是tls协议，就用ws/http
          this.connection.url = urlStr.replace("wss://", "ws://").replace("https://", "http://");
        }
      
        log.debug(`获取到连接方法: ${urlStr}`);
      })
      .catch((error) => {
        throw new Error(
          `获取连接方法失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
  }
}
export default XEP0156;
