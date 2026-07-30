import type { Plugin } from "../types";
import type Connection from "@/connection";
import { XMPPElement } from "@/ltx";
import { Presence, Iq} from "@/stanza";
import { XMPPError } from "@/errors";

type Subscription = "none" | "to" | "from" | "both" | "remove";
export interface Roster {
  approved: boolean;
  jid: string;
  name?: string;
  ask?: 'subscribe';
  subscription: Subscription;
}

/**
 * RFC6121: XMPP 即时消息和存在
 * @see https://datatracker.ietf.org/doc/html/rfc6121
 */
class RFC6121 implements Plugin {
  name = "RFC6121: XMPP Instant Messaging and Presence";
  static readonly NS = "jabber:iq:roster" as const;
  readonly connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  init() {
    this.connection.registerStanzaPlugin(RFC6121.NS, RFC6121.parseRseterEl);
    this.connection.registerEventPlugin("roster:update",{
      tagName:"iq",
      matcher: (iq) => {
        return iq.type === 'set' && iq.roster !== void 0;
      }
    });

    // 回应roster更新，本地更新另作处理
    this.connection.on("roster:update", (iq) => {
      const iqEl = Iq.createIq("result");
      iqEl.setAttribute("id", iq.id!);
      this.connection.send(iqEl);
    });
  }

  async getRoster() {
    const iq = Iq.createIq("get", void 0, RFC6121.NS);
    const res = await this.connection.sendAsync(iq);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "获取roster失败");
    }
    const rosterEl = res.getElementsByTagNameNS(RFC6121.NS, 'query')[0];
    const roster = RFC6121.parseRseterEl(rosterEl).roster

    return roster;
  }

  async setRoster(jid: string, name?: string, group?: string) {
    const iqEl = Iq.createIq("set", void 0, RFC6121.NS);
    const item = XMPPElement.createElement("item");
    item.setAttribute("jid", jid);
    if (name) {
      item.setAttribute("name", name);
    }
    if (group) {
      const groupEl = XMPPElement.createElement("group");
      groupEl.textContent = group;
      item.appendChild(groupEl);
    }
    iqEl.getElementsByTagNameNS(RFC6121.NS, "query")[0].appendChild(item);
    const res = await this.connection.sendAsync(iqEl);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "设置roster失败");
    }
  }

  async removeRoster(jid: string) {
    const iq = Iq.createIq("set", void 0, RFC6121.NS);
    const item = XMPPElement.createElement("item");
    item.setAttribute("jid", jid);
    item.setAttribute("subscription", "remove");
    iq.getElementsByTagNameNS(RFC6121.NS, "query")[0].appendChild(item);
    const res = await this.connection.sendAsync(iq);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "删除roster失败");
    }
  }

  /** 请求订阅对方的存在状态 */
  async requestSubscription(jid: string) {
    const presence = Presence.createPresence(jid, "subscribe");
    this.connection.send(presence);
  }

  /** 撤销被订阅/拒绝订阅请求/取消预批准 */
  removeSubscription(jid: string) {
    const presence = Presence.createPresence(jid, "unsubscribed");
    this.connection.send(presence);
  }

  /** 取消订阅 */
  cancelSubscribe(jid: string) {
    const presence = Presence.createPresence(jid, "unsubscribe");
    this.connection.send(presence);
    this.connection.send(presence);
  }

  /** 预批准被订阅请求/批准订阅请求 */
  approveSubscription(jid: string) {
    const presence = XMPPElement.createElementNS("jabber:client", "presence");
    presence.setAttribute("to", jid);
    presence.setAttribute("type", "subscribed");
    this.connection.send(presence);
  }
  
  static parseRseterEl(el: XMPPElement): {roster:Roster[]} {
    if (el.namespaceURI !== RFC6121.NS) throw new Error("不是一个roster");
    const items = el.getElementsByTagName("item");
    const rosters = Array.from(items).map((item) => {
      const approved = item.getAttribute("approved") === "true";
      const jid = item.getAttribute("jid")!;
      const name = item.getAttribute("name") ?? void 0;
      const ask = item.getAttribute("ask") as 'subscribe' | null ?? void 0;
      const subscription = (item.getAttribute("subscription") ??
        "none") as Subscription;
      return { approved, jid, name, ask, subscription };
    });

    return {roster:rosters};
  }
}


declare module "../../connection" {
  export interface SocketEventMap {
    /** RFC6121，你自己根据subscription判断是添还是删除 */
    "roster:update": Iq;
  }
}

declare module "../../stanza" {
  export interface Iq {
    roster?: Roster[];
  }
}
export default RFC6121;
