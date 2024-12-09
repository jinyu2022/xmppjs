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

    this.connection.on("iq", (stanza) => {
      // 如果节是向客户端询问disco信息，则回复
      // 获取命名空间
      const query = stanza.getElementsByTagName("query")[0];
      const from = stanza.getAttribute("from")!;
      const id = stanza.getAttribute("id")!;
      const node = query.getAttribute("node");
      if (query.namespaceURI === this.NS.DISCO_INFO) {
        const reply = this.createInfoResult(from, id, node);
        this.connection.send(reply);
        console.log(stanza);
      }else if (query.namespaceURI === this.NS.DISCO_ITEMS) {
        const reply = this.createItemsResult(from, id, node);
        this.connection.send(reply);
        console.log(stanza);
      }else{
        console.error(stanza);
        throw new Error("未知的disco查询");
      }
    });
  }
}
export default XEP0030;