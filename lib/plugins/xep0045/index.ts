import type { Connection } from "@/connection";
import { Plugin } from "../types";
import { MUC, JoinOptions, MUCStatusCode } from "./muc";
import { XMPPError, TimeoutError } from "@/errors.ts";
import { XEP0004 } from "../xep0004";
import { JID } from "@/JID";
import type { DataForm, Field } from "../xep0004/form";
import type { MUCItem, MUCUserPres } from "./typing";

export class XEP0045 extends MUC implements Plugin {
    readonly name = "XEP0045";
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;

    /** 存储已加入的房间信息，键是room jid */
    readonly rooms: Map<string, MUCItem> = new Map();
    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.XEP0030!.addFeature(XEP0045.NS.BASE);

        this.connection.registerStanzaPlugin(
            XEP0045.NS.USER,
            XEP0045.parsePresUser
        );
        this.connection.registerEventPlugin("muc:join", {
            tagName: "presence",
            matcher: (pers: Presence) => {
                return Boolean(pers.muc?.item && !pers.muc.statuses?.length);
            },
        });
        this.connection.registerEventPlugin("muc:leave", {
            tagName: "presence",
            matcher: (pers: Presence) => {
                return Boolean(pers.muc?.item && pers.type === "unavailable");
            },
        });
        this.connection.registerEventPlugin("muc:groupchat", {
            tagName: "message",
            matcher: (msg) => {
                return Boolean(msg.type === "groupchat" && msg.body);
            },
        });
        this.connection.registerEventPlugin("muc:subject", {
            tagName: "message",
            matcher: (msg) => {
                return Boolean(msg.type === "groupchat" && msg.subject && !msg.body);
            },
        });
        this.connection.registerEventPlugin("muc:kick", {
            tagName: "presence",
            matcher: (pers) => {
                return Boolean(pers.muc?.statuses?.includes(MUCStatusCode.Kicked));
            },
        });
        this.connection.registerEventPlugin("muc:ban", {
            tagName: "presence",
            matcher: (pers) => {
                return Boolean(pers.muc?.statuses?.includes(MUCStatusCode.Banned));
            },
        });
        this.connection.registerEventPlugin("muc:destroy", {
            tagName: "presence",
            matcher: (pers) => {
                return Boolean((pers.muc as MUCUserPres<"destroy">)?.destroy);
            },
        });
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
     * @returns 加入房间的响应节
     */
    async join(
        room: string | JID,
        nick: string,
        options?: JoinOptions,
        timeout = 300_0000
    ) {
        const pres = XEP0045.createJoinPres(room, nick, options, timeout);
        const res = await this.connection.sendAsync(pres, timeout);
        // 如果加入失败，服务端会返回一个错误的presence
        if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "加入房间失败");
        } else if (res.getAttribute("type") === null) {
            // 如果没有返回类型，说明加入成功
            console.log("加入房间成功");
        } else {
            console.error("未知类型", res);
        }
        return res;
    }

    async leave(to: string | JID, reason?: string) {
        const pres = XEP0045.createLeavePres(to, reason);
        const res = await this.connection.sendAsync(pres);
        if (res.getAttribute("type") === "unavailable") {
            console.log("离开房间成功");
        } else if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "离开房间失败");
        }
    }

    setNick(room: string | JID, nick: string) {
        if (typeof room === "string") room = new JID(room);
        if (!this.rooms.has(room.bare)) throw new Error("未加入房间");
        const pres = XEP0045.createSetNickPres(room, nick);
        const id = pres.getAttribute("id")!;
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
                    const x = stanza.getElementsByTagNameNS(XEP0045.NS.USER, "x")[0];
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
            }, 10_000);

            this.connection.send(pres);
        });
    }

    requestVoice(room: string | JID) {
        const pres = XEP0045.createRequestVoiceMsg(room);
        this.connection.send(pres);
    }

    /**
     * 设置房间主题
     * @param room 房间jid
     * @param subject 主题
     * @link https://xmpp.org/extensions/xep-0045.html#enter-subject
     */
    async setSubject(room: string | JID, subject: string) {
        const msg = XEP0045.createSetSubjectMsg(room, subject);
        const res = await this.connection.sendAsync(msg);
        if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "设置主题失败");
        } else if (res.getAttribute("type") === "groupchat") {
            console.log("设置主题成功");
        }
    }

    /**
     * 踢出
     * @param room 房间jid
     * @param nick 室内昵称
     * @param reason 原因
     */
    async kick(room: string | JID, nick: string, reason?: string) {
        const iq = XEP0045.createSetRoleIq(room, nick, "none", reason);
        this.connection.sendAsync(iq).then((res) => {
            if (res.getAttribute("type") === "error") {
                throw new XMPPError(res, "踢人失败");
            } else if (res.getAttribute("type") === "result") {
                console.log("踢人成功");
            }
        });
    }

    async ban(room: string | JID, nick: string, reason?: string) {
        const iq = XEP0045.createSetAffiliationIq(room, nick, "outcast", reason);
        this.connection.sendAsync(iq).then((res) => {
            if (res.getAttribute("type") === "error") {
                throw new XMPPError(res, "禁言失败");
            } else if (res.getAttribute("type") === "result") {
                console.log("禁言成功");
            }
        });
    }

    async getRoomConfig(room: string | JID) {
        const iq = XEP0045.createGetRoomConfigIq(room);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "获取房间配置失败");
        }
        const formEl = res.getElementsByTagNameNS(XEP0004.NS, "x")[0];
        const form = XEP0004.parseFormEl(formEl).form;
        return form;
    }

    async setRoomConfig(room: string | JID, dataForm: DataForm) {
        const iq = XEP0045.createSetRoomConfigIq(room, dataForm);
        const res = await this.connection.sendAsync(iq);
        if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "设置房间配置失败");
        }
        return res;
    }

    /**
     * 创建私人群聊
     */
    async createPrivateRoom(room: string, roomName: string) {
        // 首先请求配置表单
        const form = await this.getRoomConfig(room);
        form.type = "submit";
        const fields = form.fields;
        // 去除options
        for (const field of fields) {
            delete field.options;
        }
        for (const field of fields) {
            switch (field.var) {
                // 设置房间名
                case "muc#roomconfig_roomname":
                    field.values = [roomName];
                    break;
                // 仅限成员
                case "MUC#roomconfig_membersonly":
                    field.values = ["1"];
                    break;
                // 开启审核
                case "MUC#roomconfig_moderatedroom":
                    field.values = ["1"];
                    break;
                // 不允许公开搜索
                case "MUC#roomconfig_publicroom":
                    field.values = ["0"];
                    break;
                // 公开用户的JID
                case "muc#roomconfig_whois":
                    field.values = ["anyone"];
                    break;
            }
        }
        const res = await this.setRoomConfig(room, form);
        if (res.getAttribute("type") === "result") {
            console.log("创建房间成功");
        } else if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "创建房间失败");
        } else {
            throw new XMPPError(res, "未知的stanza类型");
        }
    }

    /**
     * 创建公开频道
     * @param room 房间jid
     * @param roomName 房间名
     */
    async createPublicRoom(room: string, roomName: string) {
        // 首先请求配置表单
        const form = await this.getRoomConfig(room);
        form.type = "submit";
        const fields = form.fields;
        // 去除options
        for (const field of fields) {
            delete field.options;
        }
        for (const field of fields) {
            switch (field.var) {
                // 设置房间名
                case "muc#roomconfig_roomname":
                    field.values = [roomName];
                    break;
                // 开启公开搜索
                case "MUC#roomconfig_publicroom":
                    field.values = ["1"];
                    break;
                // 公开用户的JID
                case "muc#roomconfig_whois":
                    field.values = ["anyone"];
                    break;
            }
        }
        const res = await this.setRoomConfig(room, form);
        if (res.getAttribute("type") === "result") {
            console.log("创建房间成功");
        } else if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "创建房间失败");
        } else {
            throw new XMPPError(res, "未知的stanza类型");
        }
    }
}

import type { Message, Presence } from "@/stanza";

declare module "@/stanza" {
    interface Presence {
        muc?: MUCUserPres<"destroy" | "invite" | "decline">;
    }
}
declare module "@/connection" {
    interface SocketEventMap {
        "muc:join"?: Presence;
        "muc:leave"?: Presence;
        /** 接受到来自群聊的消息时触发 */
        "muc:groupchat"?: Message;
        /** 收到群聊主题时触发 */
        "muc:subject"?: Message;
        "muc:mediated-invite"?: Presence;
        // "muc:direct-invite"?: Presence;
        /** 邀请被拒绝 */
        "muc:decline"?: Presence;
        /** 房间被销毁 */
        "muc:destroy"?: Presence;
        "muc:kick"?: Presence;
        "muc:ban"?: Presence;
        "muc:voice-request"?: Presence;
    }
}

export default XEP0045;
