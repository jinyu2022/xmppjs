import { v4 as uuidv4 } from "uuid";
import type { Connection } from "../../connection";
import type { Presence } from "../../stanza";
import { JID } from "../../JID";
import { implementation } from "../../shims";
import { XMPPError, TimeoutError } from "../../errors";
interface JoinOptions {
  maxchars?: number;
  maxstanzas?: number;
  seconds?: number;
  since?: Date;
  password?: string;
}

interface MUCItem {
  role: "none" | "visitor" | "participant" | "moderator";
  affiliation: "none" | "outcast" | "member" | "admin" | "owner";
  show: "away" | "chat" | "dnd" | "xa";
  status?: string;
  nick?: string;
}
enum MUCStatusCode {
  /** 100 - 用户的完整 JID 对所有成员可见 */
  FullJIDVisible = "100",
  /** 101 - 用户成员身份变更 (不在房间时) */
  AffiliationChanged = "101",
  /** 102 - 房间现在显示不可用成员 */
  ShowUnavailable = "102",
  /** 103 - 房间现在不显示不可用成员 */
  HideUnavailable = "103",
  /** 104 - 发生了非隐私相关的房间配置变更 */
  ConfigChanged = "104",
  /** 110 - 此 presence 来自用户自身 */
  SelfPresence = "110",
  /** 170 - 房间日志记录已启用 */
  LoggingEnabled = "170",
  /** 171 - 房间日志记录已禁用 */
  LoggingDisabled = "171",
  /** 172 - 房间现在是非匿名的 */
  NonAnonymous = "172",
  /** 173 - 房间现在是半匿名的 */
  SemiAnonymous = "173",
  /** 174 - 房间现在是完全匿名的 */
  FullyAnonymous = "174",
  /** 201 - 已创建一个新房间 */
  Created = "201",
  /** 210 - 用户的室内昵称已被分配或修改 */
  NickAssigned = "210",
  /** 301 - 用户已被禁止进入该房间 */
  Banned = "301",
  /** 303 - 新房间昵称 */
  NewNick = "303",
  /** 307 - 用户已被踢出房间 */
  Kicked = "307",
  /** 321 - 由于成员身份变更，用户被移除 */
  AffiliationRemoved = "321",
  /** 322 - 由于房间改为仅限成员，用户被移除 */
  MembersOnlyRemoved = "322",
  /** 332 - 由于系统关闭，用户被移除 */
  SystemShutdownRemoved = "332",
}
export class MUC {
  readonly NS = {
    BASE: "http://jabber.org/protocol/muc",
    USER: "http://jabber.org/protocol/muc#user",
    ADMIN: "http://jabber.org/protocol/muc#admin",
    OWNER: "http://jabber.org/protocol/muc#owner",
  } as const;

  readonly ROLE = ["none", "visitor", "participant", "moderator"] as const;
  readonly AFFILIATION = [
    "none",
    "outcast",
    "member",
    "admin",
    "owner",
  ] as const;
  /** 存储已加入的房间信息，键是room jid */
  readonly rooms: Map<string, MUCItem> = new Map();
  connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    connection.on("presence", (stanza) => {});
  }

  /**
   * 加入MUC
   * @param room 要加入的房间
   * @param nick 昵称
   * @param options 加入选项，全部可选
   *   - maxchars 最大字符数
   *   - maxstanzas 最大消息数
   *   - seconds 最大秒数
   *   - since 从某个时间开始
   *   - password 房间密码
   * @param timeout 超时时间，默认为5分钟
   */
  join(
    room: string | JID,
    nick: string,
    options?: JoinOptions,
    timeout = 300_0000
  ) {
    if (typeof room === "string") room = new JID(room);
    const roomJID = `${room.bare}/${nick}`;
    const pres = this.connection.createPres(roomJID);
    const x = implementation.createDocument(this.NS.BASE, "x", null);

    if (options) {
      const { maxchars, maxstanzas, seconds, since, password } = options;
      const history = x.createElement("history");
      if (maxchars) history.setAttribute("maxchars", maxchars.toString());
      if (maxstanzas) history.setAttribute("maxstanzas", maxstanzas.toString());
      if (seconds) history.setAttribute("seconds", seconds.toString());
      if (since) history.setAttribute("since", since.toISOString());
      if (password) {
        const passwordElement = x.createElement("password");
        passwordElement.textContent = password;
        x.appendChild(passwordElement);
      }
      x.appendChild(history);
    }
    pres.appendChild(x);
    this.connection.sendAsync(pres.documentElement, timeout).then((res) => {
      // 如果加入失败，服务端会返回一个错误的presence
      if (res.getAttribute("type") === "error") {
        throw new XMPPError(res, "加入房间失败");
      } else if (res.getAttribute("type") === null) {
        // 如果没有返回类型，说明加入成功
        console.log("加入房间成功", res);
      } else {
        console.error("未知类型", res);
      }
    });
  }

  /**
   * 离开MUC
   * @param to 包含自己昵称的完整的room JID
   * @param reason 原因
   */
  leave(to: string | JID, reason?: string) {
    const pres = this.connection.createPres(to, "unavailable");
    if (reason) {
      const status = pres.createElement("status");
      status.textContent = reason;
      pres.appendChild(status);
    }
    this.connection.sendAsync(pres.documentElement).then((res) => {
      if (res.getAttribute("type") === "unavailable") {
        console.log("离开房间成功");
      } else if (res.getAttribute("type") === "error") {
        throw new XMPPError(res, "离开房间失败");
      } else {
        console.error("未知类型", res);
        throw new XMPPError(res, "未知类型");
      }
    });
  }

  setNick(room: string | JID, nick: string): Promise<Element> {
    if (typeof room === "string") room = new JID(room);
    if (!this.rooms.has(room.bare)) throw new Error("未加入房间");

    const roomJID = `${room.bare}/${nick}`;
    const pres = this.connection.createPres(roomJID);
    const id = uuidv4();
    pres.documentElement.setAttribute("id", id);

    const selfRoomJid = `${room.bare}/${this.rooms.get(room.bare)!.nick}`;

    return new Promise((resolve, reject) => {
      const handler = (presence: Presence) => {
        // TODO: 应该更加优雅的处理
        const stanza = presence.xml;
        // 处理错误响应
        if (stanza.getAttribute("id") === id) {
          clearTimeout(timeoutId);
          this.connection.off("presence", handler);
          if (stanza.getAttribute("type") === "error") {
            return reject(new XMPPError(stanza, "设置昵称失败"));
          }
          return reject(new XMPPError(stanza, "未知类型"));
        }

        // 处理成功响应
        if (stanza.getAttribute("from") === selfRoomJid) {
          const x = stanza.getElementsByTagNameNS(this.NS.USER, "x")[0];
          if (!x) return;

          const hasSuccess = Array.from(x.getElementsByTagName("status")).some(
            (s) => s.textContent === MUCStatusCode.SelfPresence
          );

          if (hasSuccess) {
            clearTimeout(timeoutId);
            this.connection.off("presence", handler);
            console.log("设置昵称成功");
            resolve(stanza);
          }
        }
      };

      const timeoutId = setTimeout(() => {
        this.connection.off("presence", handler);
        reject(new TimeoutError("设置昵称超时"));
      }, 10000);

      this.connection.on("presence", handler);
      this.connection.send(pres.documentElement);
    });
  }

  mediatedinvite(room: string | JID, recipient: string | JID, reason = "") {
    const message = implementation.createDocument(
      "jabber:client",
      "message",
      null
    );
    message.documentElement.setAttribute("to", room.toString());
    const x = message.createElementNS(this.NS.USER, "x");
    const invite = message.createElement("invite");
    invite.setAttribute("to", recipient.toString());
    const reasonElement = message.createElement("reason");
    reasonElement.textContent = reason;
    invite.appendChild(reasonElement);
    x.appendChild(invite);
    message.documentElement.appendChild(x);

    this.connection
      .sendAsync(message.documentElement)
      .then((res) => {
        if (res.getAttribute("type") === "error") {
          throw new XMPPError(res, "邀请失败");
        } else {
          console.error("返回奇怪的东西", res);
        }
      })
      .catch((res) => {
        // TODO: 应该和上面一样处理
        if (res instanceof TimeoutError) {
          return true;
        } else {
          throw res;
        }
      });
  }
}
