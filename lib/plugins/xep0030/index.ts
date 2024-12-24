import type { Plugin } from "../types";
import { Connection } from "../../connection";
import { Iq } from "@/stanza";
import { Disco } from "./disco";
import type { Identity } from "./disco";


export class XEP0030 extends Disco implements Plugin {
  /** 服务器的功能 */
  private readonly serverFeatures: Set<string> = new Set();
  /** 服务器的身份 */
  private readonly serverIdentities: Array<Identity> = [];
  constructor(connection: Connection) {
    super(connection);
    connection.disco = this;
  }

  init() {
    this.addFeature(Disco.NS.DISCO_INFO);
    this.addFeature(Disco.NS.DISCO_ITEMS);

    this.connection.socket!.once('binded', async () => {
      const iq = Iq.createIq("get",this.connection.jid.domain ,Disco.NS.DISCO_INFO);
      let identities: Identity[]
      let features: string[]
      try {
        const res = await this.connection.sendAsync(iq.documentElement!);
        const query = Disco.parseDiscoInfo(res)
        identities = query.identities;
        features = query.features;
        console.log("服务器身份特性获取成功");
      }catch {
        identities = []
        features = []
        console.warn("服务器身份特性获取失败");
      }
      this.serverFeatures.clear();
      this.serverIdentities.length = 0;
      for (const feature of features) {
        this.serverFeatures.add(feature);
      }
      for (const identity of identities) {
        this.serverIdentities.push(identity);
      }
      this.connection.emit("serverDiscovered");
    
    })

    this.connection.on("iq", (iq) => {
      if (iq.type !== "get") return;
      // TODO: 不应该操作xml，应该操作对象
      const stanza = iq.xml;
      // 如果节是向客户端询问disco信息，则回复
      // 获取命名空间
      const query = stanza.getElementsByTagName("query")[0];
      if (!query) return;

      const from = stanza.getAttribute("from")!;
      const id = stanza.getAttribute("id")!;
      const node = query.getAttribute("node");
      if (query.namespaceURI === Disco.NS.DISCO_INFO) {
        const reply = this.createInfoResult(from, id, node);
        this.connection.send(reply);
      }else if (query.namespaceURI === Disco.NS.DISCO_ITEMS) {
        const reply = this.createItemsResult(from, id, node);
        this.connection.send(reply);
      }else{
        console.warn("无关disco查询", query);
      }
    });
  }

  getServerFeatures(): Promise<Set<string>> {
    if (this.serverFeatures.size > 0) {
      return Promise.resolve(this.serverFeatures);
    }else{
      return new Promise((resolve) => {
        this.connection.once("serverDiscovered", () => {
          resolve(this.serverFeatures);
        });
      });
    }
  }

  getServerIdentities(): Promise<Array<Identity>> {
    if (this.serverIdentities.length > 0) {
      return Promise.resolve(this.serverIdentities);
    }else{
      return new Promise((resolve) => {
        this.connection.once("serverDiscovered", () => {
          resolve(this.serverIdentities);
        });
      });
    }
  }
}
export default XEP0030;

declare module "../../connection" {
  interface SocketEventMap {
    /**@internal 你不应该使用这个*/
    "serverDiscovered": void;
  }
}