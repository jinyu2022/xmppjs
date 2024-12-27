import type { Plugin } from "@/plugins/types";
import type Connection from "@/connection";
import type { Iq } from "@/stanza";
import { TimeoutError } from "@/errors";
import Ping from "./ping";
import logger from "@/log";
const log = logger.getLogger("XEP0199");
export default class XEP0199 extends Ping implements Plugin {
    static readonly name = "XEP-0199：XMPP Ping";
    static readonly dependencies = ["XEP0030"] as const;
    static readonly version = "2.0.1 (2019-03-26)";
    readonly connection: Connection;
    static readonly config = {
        keepalive: true,
        interval: 300_000,
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
                iq.xml.getElementsByTagNameNS("urn:xmpp:ping", "ping").length > 0
            ) {
                const result = Ping.createPingResultIq(iq.from!, iq.id!);
                this.connection.send(result);
            }
        };
        this.connection.on("iq", respondToPingIq);

        this.connection.XEP0030!.addFeature(XEP0199.NS);
        this.connection.XEP0030!.getServerFeatures().then((features) => {
            if (features.has(XEP0199.NS)) {
                // 启动keepalive
                this.keepAlivePing();
            } else {
                log.error("服务器不支持XEP-0199");
            }
        });
    }

    static setConfig(config: typeof XEP0199.config) {
        Object.assign(XEP0199.config, config);
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
                return;
            } else {
                throw new Error("Ping failed");
            }
        }

        const endTime = Date.now(); // End timing
        const duration = endTime - startTime; // Calculate duration

        if (res.getAttribute("type") === "error") {
            throw new Error("Ping failed");
        }

        log.debug(`Ping to ${to} took ${duration} ms`);
        return duration;
    }
    // static options
    keepAlivePing() {
        setInterval(() => {
            if (XEP0199.config.keepalive) {
                this.ping(this.connection.jid.domain, XEP0199.config.timeout);
            }
        }, XEP0199.config.interval);
    }
    /** 启动 */
}
