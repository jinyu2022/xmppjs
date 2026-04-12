import { JID } from "@/JID";
import { MucSelfPing } from "./MucSelfPing";
import type { Plugin } from "../types";
import Connection from "@/connection";
import { XMPPError } from "@/errors";
/**
 * XEP-0410: MUC Self-Ping (Schrödinger's Chat)
 * @see https://xmpp.org/extensions/xep-0410.html
 * @version 0.1.0 (2024-02-14)
 */
export class XEP0410 extends MucSelfPing implements Plugin {
    static readonly dependencies = ["XEP0045", "XEP0199"] as const;
    connection: Connection;

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        this.connection.on("session:start", async () => {
            const results = await this.pingAllJoinedRooms();
            if (results) {
                const toRejoin = results
                    .filter((r) => {
                        const status = r.status;
                        if (status.type === "result") return false;

                        // 按照规范，排除以下错误，这些错误不代表客户端已不在房间
                        // 1. service-unavailable 或 feature-not-implemented: 客户端已加入，但 pinged 的客户端未实现 XMPP Ping
                        // 2. item-not-found: 客户端已加入，但用户刚刚更改了他们的名字
                        // 3. remote-server-not-found 或 remote-server-timeout: S2S 连接问题，可能仍在房间
                        if (status.type === "error" && status.error instanceof XMPPError) {
                            return !["service-unavailable", "feature-not-implemented", "item-not-found", "remote-server-not-found", "remote-server-timeout"].includes(status.error.condition ?? "");
                        }
                        return false;
                    })
                    .map((r) => r.roomJid);

                await this.rejoinRooms(toRejoin);
            }
        });
    }

    /**
     * 批量重新加入房间
     * @param roomJids 房间 JID 列表
     */
    async rejoinRooms(roomJids: string[]) {
        const muc = this.connection.XEP0045;
        if (!muc) return;

        for (const roomJid of roomJids) {
            const info = muc.rooms.get(roomJid);
            if (info) {
                await muc.join(roomJid, info.nick);
            }
        }
    }

    /**
     * Ping 所有已加入的房间以确认会话状态
     */
    async pingAllJoinedRooms() {
        const muc = this.connection.XEP0045;
        if (!muc) return;

        const results = [];
        for (const [roomJid, info] of muc.rooms) {
            const occupantJid = `${roomJid}/${info.nick}`;
            results.push(this.pingOccupant(occupantJid).then(status => ({
                roomJid,
                status
            })));
        }
        return Promise.all(results);
    }

    /**
     * 发送 self-ping 到指定的 occupant JID，检测用户是否仍在房间
     * @param to occupant JID (e.g. 'room@service/nick')
     */
    async pingOccupant(to: string | JID) {
        return this.connection.XEP0199!.ping(to.toString())
        .then((duration) => ({ type: "result", duration } as const))
        .catch((error) => ({ type: "error", error } as const));
    }
}
export default XEP0410;
