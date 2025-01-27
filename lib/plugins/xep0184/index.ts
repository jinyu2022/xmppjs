import { MessageReceips } from "./messageReceips";
import type Connection from "@/connection";
import type { Plugin } from "../types";
import { implementation } from "@/shims"; 

/**
 * XEP-0184: Message Receipts
 * version: 1.0.0 (2024-09-24)
 * @see https://xmpp.org/extensions/xep-0184.html
 * 
 * 1. 客户端发送消息时，会自动添加回执请求
 * 2. 客户端接收到消息时，会自动处理回执请求
 */
export default class XEP0184 extends MessageReceips implements Plugin {

  /** XMPP连接实例 */
  readonly connection: Connection;
  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }
  init() {
    this.connection.registerStanzaPlugin(MessageReceips.NS, XEP0184.parseReceipts);
    // 拦截发送消息，添加回执请求
    this.connection.registerInterceptor("send", (stanza) => {
      if (
        stanza.tagName === "message" &&
        stanza.getElementsByTagName("body").length
      ) {
        const id = stanza.getAttribute("id")!;
        stanza.appendChild(XEP0184.createReceiptsEl("request", id));
      }
      return stanza;
    });
    // 接收消息，处理回执请求
    this.connection.on("message", (message) => {
      // 聊天室中发送 “groupchat” 类型的内容消息时，不建议请求回执
      /**@see https://xmpp.org/extensions/xep-0184.html#when-groupchat */
      if (message.receipts?.type === "request" && message.type !== "groupchat") { 
        const id = message.id!;
        const doc = implementation.createDocument("jabber:client", "message")
        const received  = XEP0184.createReceiptsEl("received", id);
        const msg = doc.documentElement!;
        msg.setAttribute("to", message.from!);
        msg.setAttribute("type", message.type);
        msg.appendChild(received);
        this.connection.send(msg); 
      } 
    });
  }
}
