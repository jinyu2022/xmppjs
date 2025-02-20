import type { Plugin } from "../types";
import type Connection from "@/connection";
import { implementation } from "@/shims";
import { XMPPError } from "@/errors";

type Subscription = "none" | "to" | "from" | "both" | "remove";
export interface Roster {
  approved: boolean;
  jid: string;
  name?: string;
  ask?: 'subscribe';
  subscription: Subscription;
}
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
      const doc = implementation.createDocument("jabber:client", "iq", null);
      const iqEl = doc.documentElement!;
      iqEl.setAttribute("type", "result");
      iqEl.setAttribute("id", iq.id!);
      this.connection.send(iqEl);
    });
  }

  async getRoster() {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement!;
    iq.setAttribute("type", "get");
    const query = doc.createElementNS(RFC6121.NS, "query");
    iq.appendChild(query);
    const res = await this.connection.sendAsync(iq);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "获取roster失败");
    }
    const rosterEl = res.getElementsByTagNameNS(RFC6121.NS, 'query')[0];
    const roster = RFC6121.parseRseterEl(rosterEl).roster

    return roster;
  }

  async setRoster(jid: string, name?: string, group?: string) {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement!;
    iq.setAttribute("type", "set");
    const query = doc.createElementNS(RFC6121.NS, "query");
    iq.appendChild(query);
    const item = doc.createElement("item");
    item.setAttribute("jid", jid);
    if (name) {
      item.setAttribute("name", name);
    }
    if (group) {
      const groupEl = doc.createElement("group");
      groupEl.textContent = group;
      item.appendChild(groupEl);
    }
    query.appendChild(item);
    const res = await this.connection.sendAsync(iq);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "设置roster失败");
    }
  }

  async removeRoster(jid: string) {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement!;
    iq.setAttribute("type", "set");
    const query = doc.createElementNS(RFC6121.NS, "query");
    iq.appendChild(query);
    const item = doc.createElement("item");
    item.setAttribute("jid", jid);
    item.setAttribute("subscription", "remove");
    query.appendChild(item);
    const res = await this.connection.sendAsync(iq);
    if (res.getAttribute("type") === "error") {
      throw new XMPPError(res, "删除roster失败");
    }
  }

  async requestSubscription(jid: string) {
    const doc = implementation.createDocument("jabber:client", "presence", null);
    const presence = doc.documentElement!;
    presence.setAttribute("to", jid);
    presence.setAttribute("type", "subscribe");
    this.connection.send(presence);
  }

  /** 撤销被订阅/拒绝订阅请求/取消预批准 */
  removeSubscription(jid: string) {
    const doc = implementation.createDocument("jabber:client", "presence", null);
    const presence = doc.documentElement!;
    presence.setAttribute("to", jid);
    presence.setAttribute("type", "unsubscribed");
    this.connection.send(presence);
  }

  /** 取消订阅 */
  cancelSubscribe(jid: string) {
    const doc = implementation.createDocument("jabber:client", "presence", null);
    const presence = doc.documentElement!;
    presence.setAttribute("to", jid);
    presence.setAttribute("type", "unsubscribe");
    this.connection.send(presence);
  }

  /** 预批准被订阅请求/批准订阅请求 */
  approveSubscription(jid: string) {
    const doc = implementation.createDocument("jabber:client", "presence", null);
    const presence = doc.documentElement!;
    presence.setAttribute("to", jid);
    presence.setAttribute("type", "subscribed");
    this.connection.send(presence);
  }
  
  static parseRseterEl(el: Element): {roster:Roster[]} {
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

import type { Iq } from "@/stanza";
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
