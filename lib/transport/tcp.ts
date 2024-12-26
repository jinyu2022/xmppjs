import { Socket } from "net";
import { connect as tlsConnect, TLSSocket } from "tls";
import { resolveXMPPSrv, EndpointInfo } from "../dns";
import { domParser, xmlSerializer } from "@/shims";
import { XMPPError, TimeoutError } from "@/errors";
import { Status } from "./typing";
import { EventEmitter } from "events";
import { JID } from "../JID";
import { scramResponse, generateSecureNonce } from "../auth/scram";

interface SaslData {
    mechanism?: "PLAIN" | "SCRAM-SHA-1";
    clientFirstMessageBare?: string;
    authMessage?: string;
    serverProof?: string;
}
// 定义所有可能的事件参数类型
interface SocketEventMap {
    connect: void;
    disconnect: void;
    error: Error;
    authenticated: void;
    "stream:start": void;
    "stream:end": void;
    // stanza: { name: string; attrs: Record<string, string>; children: any[] };
    "net:message": string;
    "session:start": void;
    binded: void;
    [event: string | symbol]: unknown;
}

export interface XMPPConnection extends EventEmitter {
    on<E extends keyof SocketEventMap>(
        event: E,
        listener: (arg: SocketEventMap[E]) => void
    ): this;
    once<E extends keyof SocketEventMap>(
        event: E,
        listener: (arg: SocketEventMap[E]) => void
    ): this;
    emit<E extends keyof SocketEventMap>(
        event: E,
        arg?: SocketEventMap[E]
    ): boolean;
    off<E extends keyof SocketEventMap>(
        event: E,
        listener: (arg: SocketEventMap[E]) => void
    ): this;
}
/**
 * XMPP连接类
 * 处理与XMPP服务器的TCP/TLS连接
 */
export class XMPPConnection extends EventEmitter {
    private readonly jid: JID;
    private readonly password: string;
    private readonly resource: string;
    private socket: Socket | TLSSocket | null = null;
    private readonly domain: string;
    private endpoints: EndpointInfo[] = []; // 可用的服务器端点列表
    private currentEndpoint = 0; // 当前使用的端点索引
    private readonly tls: boolean; // 是否使用TLS
    private status = 0; // 连接状态
    private readonly sasl: SaslData = {};
    private reconnectAttempts = 0; // 重连次数
    private readonly maxReconnectAttempts = 3; // 最大重连次数

    /**
     * 创建XMPP连接实例
     */
    constructor(jid: JID, password: string, tls = true) {
        super();
        this.jid = jid;
        this.password = password;
        this.tls = tls;
        this.domain = jid.domain;
        this.resource = jid.resource ?? Math.random().toString(32).slice(2, 8);;
    }

    connect() {
        resolveXMPPSrv(this.domain, this.tls).then((endpoints) => {
            if (!endpoints.length) throw new Error("未找到可用的服务器端点");
            console.log("endpoints", endpoints);
            this.endpoints = endpoints;
            for (const endpoint of this.endpoints) {
                try {
                    if (this.tls) {
                        this.createSecureConnection(endpoint);
                    } else {
                        this.createConnection(endpoint);
                    }
                    this.setupSocketListeners();
                    break;
                } catch (error) {
                    console.error(
                        `连接到 ${endpoint.host}:${endpoint.port} 失败:`,
                        error
                    );
                    continue;
                }
            }
        });
    }

    /**
     * 创建普通TCP连接
     */
    private createConnection(endpoint: EndpointInfo) {
        // 开始连接
        this.status = Status.CONNECTING;
        this.socket = new Socket();
        this.socket.connect({
            host: endpoint.host,
            port: endpoint.port,
        });
    }

    /**
     * 创建TLS加密连接
     */
    private createSecureConnection(endpoint: EndpointInfo): void {
        console.log("创建TLS连接");
        this.socket = tlsConnect({
            host: endpoint.host,
            port: endpoint.port,
            servername: endpoint.host,
            ALPNProtocols: ["xmpp-client"],
        });
    }

    /**
     * 设置Socket事件监听器
     */
    private setupSocketListeners(): void {
        this.socket!.once("connect", () => {
            this.status = Status.CONNECTED;
            const startStream = `<?xml version="1.0"?><stream:stream to="${this.domain}" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
            this.send(startStream);
            this.status = Status.STREAM_START;
            this.emit("connect");
        });

        this.socket!.on("data", (data: string) => {
            this.onData(data.toString());
        });

        this.socket!.on("error", (error) => {
            this.emit("error", error);
        });

        this.socket!.on("close", () => {
            this.status = Status.DISCONNECTED;
            this.emit("close");
            this.handleReconnect();
        });
    }

    private onData(data: string) {
        console.log("接收", data);
        if (this.status < Status.AUTHENTICATED) {
            this.authenticateUser(data);
        } else if (this.status < Status.BINDED) {
            // TIP: 一定要先发送事件，避免监听到<stream:features>，xmldom无法解析
            this.emit("net:message", data);
            this.bindResource(data);
        }else {
            this.emit("net:message", data);
        }
    }
    /**
     * 处理重连逻辑
     * @private
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.currentEndpoint = 0;
            await new Promise((resolve) =>
                setTimeout(resolve, 1000 * this.reconnectAttempts)
            );
            this.connect();
        } else {
            throw new Error("连接失败: 已达到最大重试次数");
        }
    }

    /**
     * 发送数据
     * @param data 要发送的数据
     * @returns 是否发送成功
     */
    send(data: string | Element): boolean {
        if (typeof data !== "string") {
            data = xmlSerializer.serializeToString(data);
        }
        console.log("发送", data);
        return this.socket?.write(data) ?? false;
    }

    sendAsync(data: string | Element, timeout = 30000): Promise<Element> {
        let xml: Element | null;
        if (typeof data === "string") {
            xml = domParser.parseFromString(data, "text/xml").documentElement;
            if (!xml) throw new Error("无效的XML字符串");
        } else {
            xml = data;
        }

        const id = xml.getAttribute("id");
        if (!id) throw new XMPPError(xml, "缺少id属性");

        return new Promise((resolve, reject) => {
            const onResponse = (response: string) => {
                // XXX: xmldom有bug，无法解析stream:feature标签，提示缺少命名空间
                // try{
                //     domParser.parseFromString(response, "text/xml");
                // } catch (error) {
                //     console.error("解析失败", response);
                //     console.error("发送的内容", data);
                //     return;
                // }
                const resElement = domParser.parseFromString(response, "text/xml").documentElement!
                const responseId = resElement.getAttribute("id");
                if (responseId === id) {
                    // 收到匹配的响应，解除监听并解析 Promise
                    this.off("net:message", onResponse);
                    clearTimeout(timer);
                    resolve(resElement);
                }
            };

            // 监听全局事件
            this.on("net:message", onResponse);

            // 处理超时
            const timer = setTimeout(() => {
                this.off("net:message", onResponse);
                reject(new TimeoutError(`请求超时: ${id}`));
            }, timeout);

            this.send(xml);
        });
    }

    /**
     * 升级到TLS连接
     */
    async upgradeToTLS(): Promise<void> {
        if (!this.socket || this.socket instanceof TLSSocket) {
            throw new Error("无效的socket状态");
        }
        const plainSocket = this.socket;
        this.createSecureConnection(this.endpoints[this.currentEndpoint]);
        plainSocket.destroy();
    }

    private async authenticateUser(data: string) {
        if (this.status === Status.STREAM_START) {
            if (data.includes("<?xml version='1.0'?>")) {
                this.status = Status.STREAM_ESTABLISHED;
            }
        } else if (this.status === Status.STREAM_ESTABLISHED) {
            if (data.includes("stream:features") && data.includes("mechanisms")) {
                // console.log("开始认证", data);
                // HACK: xmldom有bug，无法解析stream:features标签
                // 添加一个根元素
                data = `<root xmlns:stream="http://etherx.jabber.org/streams">${data}</root>`;
                // 解析XML
                const doc = domParser.parseFromString(data, "text/xml");
                const xml = doc.documentElement!;
                // 获取所有的 mechanism 元素
                const mechanisms = xml.getElementsByTagName("mechanism");

                /* 安全等级映射 */
                const securityLevels = {
                    PLAIN: 2, // 中等安全性
                    "SCRAM-SHA-1": 3, // 最高安全性
                } as const;
                // 提取机制名称并排序
                const supportedMechanisms = Array.from(mechanisms)
                    .map((mechanism) => mechanism.textContent!)
                    .filter((mechanism) => mechanism in securityLevels)
                    .sort(
                        (a, b) =>
                            (securityLevels[b as keyof typeof securityLevels] ?? 0) -
                            (securityLevels[a as keyof typeof securityLevels] ?? 0)
                    ) as Array<keyof typeof securityLevels>;

                // 选择最高安全等级的机制
                const selectedMechanism = supportedMechanisms[0];
                if (!selectedMechanism) throw new Error("不受支持的认证机制");

                this.sasl.mechanism = selectedMechanism;
                if (selectedMechanism === "PLAIN") {
                    this.plainAuth(data);
                } else {
                    this.scramAuth(data);
                }
            }
        } else {
            if (this.sasl.mechanism === "PLAIN") {
                this.plainAuth(data);
            } else {
                this.scramAuth(data);
            }
        }
    }

    private async scramAuth(data: string) {
        if (this.status === Status.STREAM_ESTABLISHED) {
            this.sasl.clientFirstMessageBare = `n=${this.jid.node
                },r=${generateSecureNonce()}`;
            const auth = `<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='SCRAM-SHA-1'>${btoa(
                `n,,${this.sasl.clientFirstMessageBare}`
            )}</auth>`;
            this.send(auth);
            this.status = Status.AUTHENTICATING;
        } else if (this.status === Status.AUTHENTICATING) {
            console.log("scramAuth", data);
            if (data.includes("challenge")) {
                const challenge = domParser.parseFromString(data, "text/xml")
                    .documentElement!;
                const serverFirstMessage = challenge.textContent!;
                const { clientResponse, serverProof } = await scramResponse(
                    this.password,
                    serverFirstMessage,
                    this.sasl.clientFirstMessageBare!,
                    this.sasl.mechanism as "SCRAM-SHA-1"
                );
                this.sasl.serverProof = serverProof;

                // 发送响应
                const responseXML = `<response xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${clientResponse}</response>`;
                this.send(responseXML);
            } else if (data.includes("success")) {
                // 认证成功
                this.status = Status.AUTHENTICATED;
                const xml = domParser.parseFromString(data, "text/xml")
                    .documentElement!;
                const v = atob(xml.textContent!).split("v=")[1];
                if (!v) throw new Error("无法解析服务器签名");
                console.log("v", v);

                if (v !== this.sasl.serverProof) {
                    console.log(this.sasl.serverProof);
                    // 关闭连接
                    this.disconnect();
                    throw new Error("服务器签名不匹配");
                }
                console.log("认证成功");
                this.status = Status.AUTHENTICATED;
                // 重新开始xmpp流
                const stream = `<?xml version='1.0'?><stream:stream to="${this.domain}" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
                this.send(stream);
            } else if (data.includes("failure")) {
                this.status = Status.AUTHFAIL;
                this.disconnect();
                throw new Error("认证失败");
            }
        }
    }
    private plainAuth(data: string) {
        if (this.status === Status.STREAM_ESTABLISHED) {
            const auth = `<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>${btoa(
                `\x00${this.jid.node}\x00${this.password}`
            )}</auth>`;
            this.send(auth);
            this.status = Status.AUTHENTICATING;
        } else if (this.status === Status.AUTHENTICATING) {
            if (data.includes("success")) {
                this.status = Status.AUTHENTICATED;
                console.log("认证成功");
                // 重新开始xmpp流
                const stream = `<stream:stream to="${this.domain}" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
                this.send(stream);
            } else if (data.includes("failure")) {
                this.status = Status.AUTHFAIL;
                this.disconnect();
                throw new Error("认证失败");
            }
        }
    }

    private bindResource(data: string) {
        if (data.includes("stream:features") && data.includes("urn:ietf:params:xml:ns:xmpp-bind")) {
            this.status = Status.BINDING;
            const bind = `<iq type='set' id='bind-resource' to="${this.jid.domain}"><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>${this.resource}</resource></bind></iq>`;
            console.log("绑定资源");
            console.log("接收到的", data);
            this.sendAsync(bind).then((response) => {
                // 获取jid标签的connentText
                const jid = response.getElementsByTagName("jid")[0].textContent;
                if (jid === `${this.jid.bare}/${this.resource}`) {
                    console.log("绑定成功", jid);
                    this.emit("binded");
                    this.status = Status.BINDED;

                    // 发送在线状态，开始接受消息，由connection类完成
                } else {
                    console.error("绑定失败", jid);
                }
            });
        }
    }
    disconnect() {
        // 发送关闭流的xml
        const closeXML = `<close xmlns='urn:ietf:params:xml:ns:xmpp-framing'/>`;
        this.send(closeXML);
        // 移除所有监听器
        this.removeAllListeners();
        this.socket?.removeAllListeners();
        this.close();
    }

    private close(): void {
        this.socket?.end();
        this.socket?.destroy();
        this.socket = null;
        this.status = Status.DISCONNECTED;
    }
}

export default XMPPConnection;
