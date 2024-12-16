import { Plugin } from "../types";
import type { Connection } from "../../connection";
import { Disco } from "./disco";
export class XEP0030 extends Disco implements Plugin {
  constructor(connection: Connection) {
    super(connection);
    connection.disco = this;
  }

  init() {
    this.addFeature(this.NS.DISCO_INFO);
    this.addFeature(this.NS.DISCO_ITEMS);

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
      if (query.namespaceURI === this.NS.DISCO_INFO) {
        const reply = this.createInfoResult(from, id, node);
        this.connection.send(reply);
      }else if (query.namespaceURI === this.NS.DISCO_ITEMS) {
        const reply = this.createItemsResult(from, id, node);
        this.connection.send(reply);
      }else{
        console.warn("无关disco查询", query);
      }
    });
  }
}
export default XEP0030;