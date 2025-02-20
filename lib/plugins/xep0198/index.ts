import { StreamManagement } from "./streamManagement";
import type { Plugin } from "../types";
import type Connection from "@/connection";
import { xmlSerializer } from "@/shims";
import { StanzaBase } from "@/stanza";
import { TimeoutError, XMPPError } from "@/errors";
import { Status } from "@/transport/typing";
import logger from "@/log";
const log = logger.getLogger("XEP0198");

// 声明属性
enum StreamStatus {
    DISABLE = 0,
    ENABLE_SENT = 1,
    ENABLE = 2,
}
/**
 * XEP-0198 Stream Management
 * @see https://xmpp.org/extensions/xep-0198.html
 * @version 1.6.2 (2024-09-24)
 */
export default class XEP0198 extends StreamManagement implements Plugin {

    /** XMPP连接实例 */
    readonly connection: Connection;
    /** 发送的stanza数量，也是服务端接收处理的stanza数量 */
    private outbound: number = 0;
    /** 接受的stanza数量 */
    private inbound: number = 0;
    /** 请求确认的消息间隔数 */
    private readonly interval = 5;
    /** 流管理状态 */
    private status: StreamStatus = StreamStatus.DISABLE;
    /** 最大恢复时间(秒) */
    private max = 300;
    /** 会话恢复ID */
    private previd: string = "";
    /** 服务器位置信息 */
    private location?: string;
    constructor(connection: Connection) {
        super();
        this.connection = connection;
    }
    init() {
        log.info('初始化 XEP-0198 Stream Management 插件');
        this.connection.registerInterceptor("send", (stanza) => {
            if (this.status >= StreamStatus.ENABLE_SENT && ["iq", "message", "presence"].includes(stanza.tagName)) {
                this.outbound++;
                log.info(`发送消息${xmlSerializer.serializeToString(stanza)}，当前发送数量：${this.outbound}`);
                // 确认已经发送后再检查
                Promise.resolve().then(() => this.requestAckAndCheck());
            }
            return stanza;
        });

        this.connection.registerInterceptor("receive", (stanza) => {
            if (this.status >= StreamStatus.ENABLE && ["iq", "message", "presence"].includes(stanza.tagName)) {
                this.inbound++;
                // log.info(`接收消息${stanza.tagName}，当前接收数量：${this.inbound}`);
            }
            return stanza;
        });

        this.connection.on("others", (stanza) => {
            if (stanza.tagName === "r" && stanza.xml.namespaceURI === XEP0198.NS) {
                log.info("收到确认请求");
                this.sendAnswerAck();
            }
        });

        this.connection.socket!.once("binded", () => {
            if (this.connection.socket!.streamFeatures.has(XEP0198.NS)) {
                this.enable();
            } else {
                log.warn('服务器不支持流管理');
            }
        });
        this.connection.on("session:end", () => {
            if (this.status < StreamStatus.ENABLE) return log.info('未启用流管理，无需恢复');
            // 获取所有注册的 disconnect 事件监听器
            const listeners = this.connection.listeners("disconnect");
            // 清除所有 disconnect 事件监听器
            this.connection.removeAllListeners("disconnect");
            // 重新连接
            try {
                log.info('重新连接');
                this.connection.socket!.connect().then(() => {
                    this.connection.socket!.once("authenticated", () => {
                        this.connection.socket!.status = Status.RECONNECTING;
                    });
                    this.connection.socket!.once("stream:negotiated", () => {
                        log.info('重新连接成功');
                        this.resume();
                    });
                    this.connection._setupSocketEvents();
                });
            } catch (e) {
                log.error('重连失败', e);
                this.status = StreamStatus.DISABLE;
                // 触发所有 disconnect 事件监听器
                for (const listener of listeners) {
                    listener();
                }
            }
        });
    }

    bindHandler() {
        return this.enable();
    }
    /**
     * 启用流管理
     * @returns Promise<Element> 服务器响应
     */
    enable() {
        log.info('正在启用流管理...');
        return new Promise<Element>((resolve, reject) => {
            const onResponse = (response: StanzaBase) => {
                // 匹配NS
                if (response.xml.namespaceURI === XEP0198.NS) {
                    this.connection.off("others", onResponse);
                    clearTimeout(timer);
                    const xml = response.xml;
                    if (
                        response.tagName !== "enabled" &&
                        (xml.getAttribute("resume") === "true" ||
                            xml.getAttribute("resume") === "1")
                    ) {
                        // 如果不是enable标签，且不支持恢复
                        log.error("启用流管理失败，服务器不支持");
                        reject(new XMPPError(xml, "启用流管理失败，服务器不支持"));
                    }

                    this.previd = xml.getAttribute("id")!;
                    if (xml.getAttribute("max")) {
                        this.max = parseInt(xml.getAttribute("max")!);
                        log.info(`设置最大恢复时间: ${this.max}秒`);
                    }
                    if (xml.getAttribute("location")) {
                        this.location = xml.getAttribute("location")!;
                        log.info(`服务器位置: ${this.location}`);
                    }
                    this.status = StreamStatus.ENABLE;
                    log.info("启用流管理成功");
                    resolve(response.xml);
                }
            };

            // 监听全局事件
            this.connection.on("others", onResponse);

            // 处理超时
            const timer = setTimeout(() => {
                this.connection.off("others", onResponse);
                reject(new TimeoutError(`请求超时`));
            }, 30_000);

            this.connection.send(`<enable xmlns='${XEP0198.NS}' resume='true'/>`);
            this.status = StreamStatus.ENABLE_SENT;
        });
    }

    /**
     * 检查是否需要请求确认并发送确认请求
     * 当发送消息数量达到interval的整数倍时触发
     */
    requestAckAndCheck() {
        if (this.status < StreamStatus.ENABLE) return;
        if (this.outbound !== 0 && this.outbound % this.interval === 0) {
            log.info("发送确认请求，当前数量", this.outbound);
            this.requestAck()
                .then(([h, outbound]) => {
                    if (h !== outbound) {
                        log.warn(
                            `服务器返回的处理的数量与本地不一致，local:${outbound}, server:${h}`
                        );
                        // this.outbound = parseInt(h);
                    }else{
                        log.info("请求确认成功");
                    }
                    
                })
                .catch((error) => {
                    log.error(`请求确认失败: ${error}`);
                });
        }
    }

    /**
     * 尝试恢复之前的会话
     * @returns Promise<Element> 服务器响应
     */
    private async resume() {
        log.info(`尝试恢复会话，previd: ${this.previd}, inbound: ${this.inbound}`);
        return new Promise<Element>((resolve, reject) => {
            const onResponse = (response: StanzaBase) => {
                if (response.xml.namespaceURI === XEP0198.NS) {
                    this.connection.off("others", onResponse);
                    clearTimeout(timer);
                    const xml = response.xml;
                    if (response.tagName !== "resumed") {
                        log.error("恢复失败");
                        reject(new XMPPError(xml, "恢复失败"));
                    }
                    if (parseInt(xml.getAttribute("h")!) !== this.outbound) {
                        log.warn(
                            `服务器返回的处理的数量与本地不一致，local:${this.outbound
                            }, server:${xml.getAttribute("h")}`
                        );
                        this.outbound = parseInt(xml.getAttribute("h")!);
                        //TODO: 重新发送未确认的消息
                    }
                    log.info("恢复成功");
                    resolve(response.xml);
                }
            };

            // 监听全局事件
            this.connection.on("others", onResponse);

            // 处理超时
            const timer = setTimeout(() => {
                this.connection.off("others", onResponse);
                log.error('恢复会话超时');
                reject(new TimeoutError(`请求超时`));
            }, 30_000);

            this.connection.send(
                `<resume xmlns='${XEP0198.NS}' h='${this.inbound}' previd='${this.previd}'/>`
            );
        });
    }

    /**
     * 发送<a/>标签确认已处理的消息数量
     */
    private sendAnswerAck() {
        log.debug(`发送确认应答，当前处理消息数: ${this.inbound}`);
        this.connection.send(`<a xmlns='${XEP0198.NS}' h='${this.inbound}'/>`);
    }

    /**
     * 发送<r/>标签请求服务器确认
     * @returns Promise<[h, outbound]> 返回服务器已处理的消息数量
     */
    private requestAck() {
        log.debug(`请求服务器确认，当前发送消息数: ${this.outbound}`);
        return new Promise<[number, number]>((resolve, reject) => {
            const onResponse = (response: StanzaBase) => {
                if (
                    response.tagName === "a" &&
                    response.xml.namespaceURI === XEP0198.NS
                ) {
                    this.connection.off("others", onResponse);
                    log.info("收到确认", response.toString());
                    clearTimeout(timer);
                    resolve([parseInt(response.xml.getAttribute("h")!), this.outbound]);
                }
            };

            // 监听全局事件
            this.connection.prependListener("others", onResponse);

            // 处理超时
            const timer = setTimeout(() => {
                this.connection.off("others", onResponse);
                log.error('请求确认超时');
                reject(new TimeoutError(`请求超时`));
            }, 30_000);

            this.connection.send(`<r xmlns='${XEP0198.NS}'/>`);
        });
    }
}
