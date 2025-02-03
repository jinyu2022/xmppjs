import Connection from "./connection";
import { JID } from "./JID";
import { plugins } from "./plugins";
import { Options } from "./types";
import { Message } from "@/stanza";
export class Client extends Connection {
  constructor(jid: string, password: string, options?: Options) {
    super(jid, password, options);
  }


  /**
   * 注册默认插件
   */
  registerDefaultPlugins() {
    for (const plugin of Object.keys(plugins)) {
      super.registerPlugin(plugin as keyof typeof plugins);
    }
  }

  /**
   * 发送消息
   * @param to - 接收方的 JID 或字符串
   * @param body - 消息内容
   * @param type - 消息类型，默认为 "normal"
   */
  sendMsg(to: JID | string, body: string, type = "normal") {
    const msg = Message.createMessage(to, body, type);
    this.send(msg.documentElement!);
  }

  /**
   * 异步发送消息，超时时间为 1000ms，主要用于接收可能的<error>
   * @param to - 接收方的 JID 或字符串
   * @param body - 消息内容
   * @param type - 消息类型，默认为 "normal"
   * @throws 超时或者发送失败时抛出异常
   */
  postMsg(to: JID | string, body: string, type = "normal") {
    const msg = Message.createMessage(to, body, type);
    return this.sendAsync(msg.documentElement!, 1000);
  }
  
  getRoster() {
    return this.RFC6121!.getRoster();
  }

  setRoster(jid: string, name?: string, group?: string) {
    return this.RFC6121!.setRoster(jid, name, group);
  }

  removeRoster(jid: string) {
    return this.RFC6121!.removeRoster(jid);
  }

  setPresence(){
    this.send(
      '<presence>'+
        '<show>chat</show>'+
      '</presence>'
    )
  }
}
