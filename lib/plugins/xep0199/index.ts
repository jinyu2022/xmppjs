import type { Plugin } from "@/plugins/types";
import type Connection from "@/connection";
import type { Iq } from "@/stanza";
import { TimeoutError, XMPPError } from "@/errors";
import Ping from "./ping";
import logger from "@/log";
import { Status } from "@/transport/typing";
const log = logger.getLogger("XEP0199");

/**
 * XEP-0199：XMPP Ping
 * @see https://xmpp.org/extensions/xep-0199.html
 * @version 2.0.1 (2019-03-26)
 */
export default class XEP0199 extends Ping implements Plugin {
    static readonly dependencies = ["XEP0030"] as const;
    readonly connection: Connection;
    private timer?: ReturnType<typeof setTimeout>;
    static config = {
        /** 是否启用keepalive功能，默认启用。 */
        keepalive: true,
        /** keepalive的ping间隔，单位毫秒，默认5分钟。 */
        interval: 300_000,
        /** ping请求的默认超时时间，单位毫秒，默认30秒。 */
        timeout: 30_000,
    };

    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    init() {
        const respondToPingIq = (iq: Iq) => {
            if (
                iq.type === "get" &&
                iq.xml.getElementsByTagNameNS(Ping.NS, "ping").length > 0
            ) {
                const result = Ping.createPingResultIq(iq.from!.toString(), iq.id!);
                this.connection.send(result);
            }
        };
        this.connection.on("iq", respondToPingIq);

        this.connection.XEP0030!.addFeature(Ping.NS);
        this.connection.XEP0030!.getServerFeatures().then((features) => {
            if (features.has(Ping.NS)) {
                // 启动keepalive
                this.keepAlivePing();
            } else {
                log.error("服务器不支持XEP-0199");
            }
        });
    }

    /**
     * 向指定的 XMPP 实体发送 ping 请求，并记录请求的耗时。
     *
     * @param to - 目标 XMPP 实体的 JID（Jabber Identifier）。
     * @returns ping耗时
     * @throws 当 ping 请求返回错误时抛出异常。
     */
    async ping(to: string, timeout = 30_000) {
        const pingIq = Ping.createSendPingIq(to);
        const startTime = Date.now();
        let res;
        try {
            res = await this.connection.sendAsync(pingIq, timeout);
        } catch (error) {
            if (error instanceof TimeoutError) {
                log.error("Ping timeout");
                throw error;
            } else {
                throw error;
            }
        }

        if (res.getAttribute("type") === "error") {
            throw new XMPPError(res, "Ping failed");
        }

        const endTime = Date.now(); // End timing
        const duration = endTime - startTime; // Calculate duration
        log.debug(`Ping to ${to} took ${duration} ms`);
        return duration;
    }
    // static options
    keepAlivePing() {
        this.timer = setTimeout(async () => {
            if (this.connection.socket?.status === Status.DISCONNECTED) {
                return;
            }
            if (XEP0199.config.keepalive) {
                try {
                    await this.ping(this.connection.jid.domain, XEP0199.config.timeout);
                } catch (error) {
                    log.warn("KeepAlive ping failed", error);
                }
            }
            if (this.connection.socket?.status !== Status.DISCONNECTED) {
                this.keepAlivePing();
            }
        }, XEP0199.config.interval);
    }
}
