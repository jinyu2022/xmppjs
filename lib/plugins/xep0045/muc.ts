import { v4 as uuidv4 } from "uuid";
import type { Presence } from "../../stanza";
import { JID } from "../../JID";
import { implementation } from "../../shims";
import { XMPPError, TimeoutError } from "../../errors";
import { Form, DataForm } from "../xep0004/form";
import { MUCUserPres } from "./typing";
import logger from "@/log";

const log = logger.getLogger("MUC");
export interface JoinOptions {
  maxchars?: number;
  maxstanzas?: number;
  seconds?: number;
  since?: Date;
  password?: string;
}

export enum MUCStatusCode {
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
  static readonly NS = {
    BASE: "http://jabber.org/protocol/muc",
    USER: "http://jabber.org/protocol/muc#user",
    ADMIN: "http://jabber.org/protocol/muc#admin",
    OWNER: "http://jabber.org/protocol/muc#owner",
  } as const;

  static readonly ROLE = [
    "none",
    "visitor",
    "participant",
    "moderator",
  ] as const;
  static readonly AFFILIATION = [
    "none",
    "outcast",
    "member",
    "admin",
    "owner",
  ] as const;

  /**
   * 加入MUC
   * @param room 要加入的房间
   * @param nick 昵称
   * @param options 加入选项，全部可选
   *   - maxchars 最大字符数，不接受则设置为0
   *   - maxstanzas 最大消息数
   *   - seconds 最大秒数
   *   - since 从某个时间开始
   *   - password 房间密码
   */
  static createJoinPres(
    room: string | JID,
    nick: string,
    options?: JoinOptions
  ) {
    if (typeof room === "string") room = new JID(room);
    const roomJID = `${room.bare}/${nick}`;
    const pres = implementation.createDocument(
      "jabber:client",
      "presence",
      null
    );
    pres.documentElement!.setAttribute("to", roomJID);
    const x = implementation.createDocument(MUC.NS.BASE, "x", null);

    if (options) {
      const { maxchars, maxstanzas, seconds, since, password } = options;
      const history = x.createElement("history");
      if (maxchars !== void 0) history.setAttribute("maxchars", maxchars.toString());
      if (maxstanzas) history.setAttribute("maxstanzas", maxstanzas.toString());
      if (seconds) history.setAttribute("seconds", seconds.toString());
      if (since) history.setAttribute("since", since.toISOString());
      // NOTE：有顺序要求
      x.documentElement!.appendChild(history);
      if (password) {
        const passwordElement = x.createElement("password");
        passwordElement.textContent = password;
        x.documentElement!.appendChild(passwordElement);
      }
    }
    pres.documentElement!.appendChild(x.documentElement!);
    return pres.documentElement!;
  }

  /**
   * 离开MUC
   * @param to 包含自己昵称的完整的room JID
   * @param reason 原因
   */
  static createLeavePres(to: string | JID, reason?: string) {
    if (typeof to !== "string") to = to.toString();
    const pres = implementation.createDocument(
      "jabber:client",
      "presence",
      null
    );
    pres.documentElement!.setAttribute("to", to);
    pres.documentElement!.setAttribute("type", "unavailable");
    if (reason) {
      const status = pres.createElement("status");
      status.textContent = reason;
      pres.documentElement!.appendChild(status);
    }
    return pres.documentElement!;
  }

  static createSetNickPres(room: string | JID, nick: string) {
    if (typeof room === "string") room = new JID(room);

    const newRoomJID = `${room.bare}/${nick}`;
    const pres = implementation.createDocument(
      "jabber:client",
      "presence",
      null
    );
    pres.documentElement!.setAttribute("to", newRoomJID);
    pres.documentElement!.setAttribute("id", uuidv4());
    return pres.documentElement!;
  }

  static mediatedinvite(room: string | JID, recipient: string | JID, reason = "") {
    const message = implementation.createDocument(
      "jabber:client",
      "message",
      null
    );
    message.documentElement!.setAttribute("to", room.toString());
    const x = message.createElementNS(MUC.NS.USER, "x");
    const invite = message.createElement("invite");
    invite.setAttribute("to", recipient.toString());
    const reasonElement = message.createElement("reason");
    reasonElement.textContent = reason;
    invite.appendChild(reasonElement);
    x.appendChild(invite);
    message.documentElement!.appendChild(x);
    return message.documentElement!;

    // this.connection
    //   .sendAsync(message.documentElement)
    //   .then((res) => {
    //     if (res.getAttribute("type") === "error") {
    //       throw new XMPPError(res, "邀请失败");
    //     } else {
    //       log.error("返回奇怪的东西", res);
    //     }
    //   })
    //   .catch((res) => {
    //     // TODO: 应该和上面一样处理
    //     if (res instanceof TimeoutError) {
    //       return true;
    //     } else {
    //       throw res;
    //     }
    //   });
  }

  static getReservedNick() {}

  static createRequestVoiceMsg(room: string | JID) {
    if (typeof room !== "string") room = room.toString();
    // XXX: 感觉不如从字符串构建
    const form = Form.createFormEl({
      type: "submit",
      fields: [
        {
          var: "FORM_TYPE",
          values: ["http://jabber.org/protocol/muc#request"],
        },
        {
          var: "muc#role",
          type: "list-single",
          label: "Requested role",
          values: ["participant"],
        },
      ],
    });

    const message = implementation.createDocument(
      "jabber:client",
      "message",
      null
    );
    message.documentElement!.setAttribute("to", room);
    message.documentElement!.appendChild(form);
    return message.documentElement!;
  }

  static createSetSubjectMsg(room: string | JID, subject: string) {
    const message = implementation.createDocument(
      "jabber:client",
      "message",
      null
    );
    message.documentElement!.setAttribute("to", room.toString());
    const subjectElement = message.createElement("subject");
    subjectElement.textContent = subject;
    message.documentElement!.appendChild(subjectElement);
    return message.documentElement!;
  }

  static createSetAffiliationIq(
    room: string | JID,
    jid: string | JID,
    affiliation: "none" | "outcast" | "member" | "admin" | "owner",
    reason?: string
  ) {
    if (typeof room !== "string") room = room.toString();
    if (typeof jid !== "string") jid = jid.toString();

    const iq = implementation.createDocument("jabber:client", "iq", null);
    iq.documentElement!.setAttribute("to", room);
    iq.documentElement!.setAttribute("type", "set");

    const query = iq.createElementNS(MUC.NS.ADMIN, "query");
    const item = iq.createElement("item");

    if (reason) {
      const reasonEl = iq.createElement("reason");
      reasonEl.textContent = reason;
      item.appendChild(reasonEl);
    }

    item.setAttribute("jid", jid);
    item.setAttribute("affiliation", affiliation);
    query.appendChild(item);
    iq.documentElement!.appendChild(query);
    return iq.documentElement!;
  }

  static createSetRoleIq(
    room: string | JID,
    nick: string | JID,
    role: "none" | "visitor" | "participant" | "moderator",
    reason?: string
  ) {
    if (typeof room !== "string") room = room.toString();
    if (typeof nick !== "string") nick = nick.toString();
    const iq = implementation.createDocument("jabber:client", "iq", null);
    iq.documentElement!.setAttribute("to", room);
    iq.documentElement!.setAttribute("type", "set");

    const query = iq.createElementNS(MUC.NS.ADMIN, "query");
    const item = iq.createElement("item");
    item.setAttribute("nick", nick);
    item.setAttribute("role", role);
    if (reason) {
      const reasonEl = iq.createElement("reason");
      reasonEl.textContent = reason;
      item.appendChild(reasonEl);
    }
    query.appendChild(item);
    iq.documentElement!.appendChild(query);
    return iq.documentElement!;
  }

  static createGetRoomConfigIq(room: string | JID) {
    if (typeof room !== "string") room = room.toString();
    const iq = implementation.createDocument("jabber:client", "iq", null);
    iq.documentElement!.setAttribute("to", room);
    iq.documentElement!.setAttribute("type", "get");

    const query = iq.createElementNS(MUC.NS.OWNER, "query");
    iq.documentElement!.appendChild(query);
    return iq.documentElement!;
  }

  static createSetRoomConfigIq(room: string | JID, form: DataForm) {
    if (typeof room !== "string") room = room.toString();
    const iq = implementation.createDocument("jabber:client", "iq", null);
    iq.documentElement!.setAttribute("to", room);
    iq.documentElement!.setAttribute("type", "set");

    const query = iq.createElementNS(MUC.NS.OWNER, "query");
    const formEl = Form.createFormEl(form);
    query.appendChild(formEl);
    iq.documentElement!.appendChild(query);
    return iq.documentElement!;
  }

  /**
   * 解析NS为muc#user的presence
   * @param presence
   */
  static parsePresUser(xEl: Element): { muc: MUCUserPres } | { muc: {} } {
    // message节也可能有muc#user，但只是标识，不包含具体信息，直接返回空对象
    if (!xEl.hasChildNodes()) return { muc: {} };

    const declineEl = xEl.getElementsByTagName("decline")[0];
    if (declineEl) {
      const declineTo = declineEl.getAttribute("to");
      const declineFrom = declineEl.getAttribute("from");
      const declineReason =
        declineEl.getElementsByTagName("reason")[0]?.textContent;
      const decline = {
        to: declineTo,
        from: declineFrom,
        reason: declineReason,
      };
      return {
        muc: decline,
      };
    }

    const invitesEl = xEl.getElementsByTagName("invite");
    if (invitesEl.length > 0) {
      const password = xEl.getElementsByTagName("password")[0]?.textContent;
      const invites = Array.from(invitesEl).map((invite) => {
        const inviteTo = invite.getAttribute("to");
        const inviteFrom = invite.getAttribute("from");
        const inviteReason =
          invite.getElementsByTagName("reason")[0]?.textContent;
        const inviteThread = invite.getAttribute("thread");
        const continueThread = invite
          .getElementsByTagName("continue")[0]
          ?.getAttribute("thread");
        return {
          inviteTo,
          inviteFrom,
          inviteReason,
          inviteThread,
          continueThread,
          password,
        };
      });

      return {
        muc: invites,
      };
    }
    // Q: 按照XML 架构，item元素可以有多个，但是我在例子中只看到一个
    const itemEl = xEl.getElementsByTagName("item")[0];
    if (xEl.getElementsByTagName("item").length > 1) {
      log.error("item元素有多个", xEl);
    }
    const affiliation = itemEl.getAttribute("affiliation");
    const role = itemEl.getAttribute("role");
    const jid = itemEl.getAttribute("jid");
    const nick = itemEl.getAttribute("nick");
    const itemReason = itemEl.getElementsByTagName("reason")[0]?.textContent;
    const actorEl = itemEl.getElementsByTagName("actor")[0];
    const actorJid = actorEl?.getAttribute("jid");
    const actorNick = actorEl?.getAttribute("nick");
    const item = {
      affiliation,
      role,
      jid,
      nick,
      reason: itemReason,
      actor: {
        jid: actorJid,
        nick: actorNick,
      },
    };
    const destroy = xEl.getElementsByTagName("destroy")[0];
    if (destroy) {
      const destroyJid = destroy?.getAttribute("jid");
      const destroyReason =
        destroy.getElementsByTagName("reason")[0]?.textContent;

      return {
        muc: {
          item,
          destroy: {
            jid: destroyJid,
            reason: destroyReason,
          },
        },
      };
    }

    const statuses = Array.from(xEl.getElementsByTagName("status")).map(
      (status) => status.getAttribute("code")!
    );
    return {
      muc: {
        item,
        statuses,
      },
    };
  }
}
