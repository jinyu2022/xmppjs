import { Socket } from "node:net";
import { connect as tlsConnect, TLSSocket } from "node:tls";
import { resolveXMPPSrv } from "../dns";
import { XMPPElement, Parser } from "@/ltx";
import { XMPPError, TimeoutError } from "@/errors";
import type { Capabilities } from "@/plugins/xep0115/entityCaps";
import { Status } from "./typing";
import {
  SaslClient,
  buildBindRequest,
  collectStreamFeatures,
  getStreamErrorCondition,
  isStreamError,
  isStreamFeatures,
  parseBindResult,
} from "./stream-negotiation";
import { EventEmitter } from "node:events";
import { JID } from "../JID";
import logger from "@/log";

const log = logger.getLogger("tcp");

interface SocketEventMap {
  connect: void;
  disconnect: void;
  error: Error;
  authenticated: void;
  "stream:start": void;
  "stream:negotiated": void;
  "stream:end": void;
  stanza: XMPPElement;
  "session:end": never;
  binded: void;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface XMPPConnection {
  on<E extends keyof SocketEventMap>(
    event: E,
    listener: (arg: SocketEventMap[E]) => void,
  ): this;
  once<E extends keyof SocketEventMap>(
    event: E,
    listener: (arg: SocketEventMap[E]) => void,
  ): this;
  emit<E extends keyof SocketEventMap>(
    event: E,
    arg?: SocketEventMap[E],
  ): boolean;
  off<E extends keyof SocketEventMap>(
    event: E,
    listener: (arg: SocketEventMap[E]) => void,
  ): this;
}

/** XMPP TCP/TLS 连接（RFC 6120）。 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class XMPPConnection extends EventEmitter {
  /** 当前完整 JID；绑定成功后可能被服务器改写 resource（RFC 6120 §7.7.1） */
  jid: JID;
  readonly password: string;
  private socket: Socket | TLSSocket | null = null;
  private readonly domain: string;
  private host: string;
  private port = "5222";
  /** 是否 使用 TLS（直连 TLS / 非 STARTTLS 升级路径） */
  private readonly tls: boolean;
  status: (typeof Status)[keyof typeof Status] = Status.DISCONNECTED;
  streamFeatures: Set<string> = new Set();
  entityCaps?: Capabilities;
  private readonly parser: Parser;
  private readonly sasl: SaslClient;
  private bindId?: string;
  private bindTimer?: ReturnType<typeof setTimeout>;

  constructor(jid: JID, password: string, tls = true) {
    super();
    if (!jid.resource) {
      const resource = Math.random().toString(32).slice(2, 8);
      jid = new JID(`${jid.bare}/${resource}`);
    }
    this.jid = jid;
    this.password = password;
    this.tls = tls;
    this.domain = jid.domain;
    this.host = jid.domain;
    this.parser = new Parser();
    this.sasl = new SaslClient(jid, password);
  }

  async connect(url?: string) {
    if (url) {
      const ParsedUrl = new URL(url);
      this.host = ParsedUrl.hostname;
      this.port = ParsedUrl.port;
    } else {
      const endpoints = await resolveXMPPSrv(this.domain, this.tls);
      if (!endpoints.length) throw new Error("未找到可用的服务器端点");
      const endpoint = endpoints[0];
      this.host = endpoint.host;
      this.port = endpoint.port.toString();
    }

    const options = {
      host: this.host,
      port: Number.parseInt(this.port),
      keepAlive: true,
      timeout: 30000,
    };
    if (this.tls) {
      Object.assign(options, {
        servername: this.host,
        ALPNProtocols: ["xmpp-client"],
      });
      this.socket = tlsConnect(options);
      this.socket.setEncoding("utf8");
      this.setupSocketListeners();
    } else {
      this.socket = new Socket();
      this.socket.setEncoding("utf8");
      this.setupSocketListeners();
      this.socket.connect(options);
    }
    this.status = Status.CONNECTING;
    log.info(`正在连接 ${this.host}:${this.port}`);
  }

  private setupSocketListeners(): void {
    if (!this.socket) throw new Error("Socket未初始化");
    this.socket.once("connect", () => {
      log.info("连接成功");
      this.status = Status.CONNECTED;
      this.sendStreamHeader();
      this.status = Status.STREAM_START;
      this.emit("connect");
    });

    this.socket.on("data", (data: Buffer | string) => {
      const text = typeof data === "string" ? data : data.toString();
      log.debug("收到数据:", text);
      this.parser.write(text);
    });

    this.parser.on("tree", (stanza) => {
      log.debug("解析到完整stanza:", stanza.tagName);
      void this.onStanza(stanza);
    });

    this.socket.on("error", (error) => {
      log.error("连接错误", error);
      this.emit("error", error);
      this.close();
    });

    this.socket.on("close", () => {
      if (this.status !== Status.SESSIONEND) {
        this.status = Status.SESSIONEND;
        this.emit("session:end");
        log.info("发出会话结束事件");
      }
      this.socket?.removeAllListeners();
      this.parser.removeAllListeners();
      this.status = Status.DISCONNECTED;
      this.emit("disconnect");
    });
  }

  private async onStanza(stanza: XMPPElement): Promise<void> {
    try {
      if (await this.handleLogin(stanza)) return;
      this.emit("stanza", stanza);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      log.error("协商失败", failure);
      this.status = failure.message.startsWith("认证失败")
        ? Status.AUTHFAIL
        : Status.ERROR;
      this.emit("error", failure);
      this.disconnect();
    }
  }

  private async handleLogin(stanza: XMPPElement): Promise<boolean> {
    if (isStreamError(stanza)) {
      throw new Error(`流错误: ${getStreamErrorCondition(stanza)}`);
    }

    if (this.status === Status.STREAM_START && isStreamFeatures(stanza)) {
      this.status = Status.STREAM_ESTABLISHED;
      this.send(this.sasl.start(stanza));
      this.status = Status.AUTHENTICATING;
      return true;
    }

    if (this.status === Status.AUTHENTICATING) {
      const result = await this.sasl.process(stanza);
      if (result.type === "send") this.send(result.data);
      if (result.type === "success") {
        this.status = Status.AUTHENTICATED;
        this.emit("authenticated");
        this.sendStreamHeader();
      }
      return true;
    }

    if (this.status === Status.AUTHENTICATED && isStreamFeatures(stanza)) {
      const features = collectStreamFeatures(stanza);
      this.streamFeatures = features.namespaces;
      this.entityCaps = features.entityCaps;
      this.emit("stream:negotiated");
      if (stanza.getElementsByTagName("bind").length > 0) {
        this.startBind();
      }
      return true;
    }

    if (this.status === Status.BINDING && stanza.getAttribute("id") === this.bindId) {
      this.finishBind(stanza);
      return true;
    }
    return this.status < Status.BINDED;
  }

  private startBind(): void {
    const request = buildBindRequest(this.jid.resource);
    this.bindId = request.id;
    this.status = Status.BINDING;
    this.send(request.data);
    this.bindTimer = setTimeout(() => {
      this.bindTimer = undefined;
      this.bindId = undefined;
      this.status = Status.ERROR;
      const error = new TimeoutError(`请求超时: ${request.id}`);
      this.emit("error", error);
      this.disconnect();
    }, 30000);
  }

  private finishBind(response: XMPPElement): void {
    if (this.bindTimer) clearTimeout(this.bindTimer);
    this.bindTimer = undefined;
    this.bindId = undefined;
    this.jid = parseBindResult(response, this.jid.bare);
    this.status = Status.BINDED;
    this.emit("binded");
  }

  /** RFC 6120 stream header */
  private sendStreamHeader(): void {
    this.writeRaw(
      `<?xml version="1.0"?><stream:stream to="${this.domain}" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`,
    );
  }

  private writeRaw(data: string): void {
    if (this.socket == null) throw new Error("连接已断开");
    try {
      this.socket.write(data);
    } catch (error) {
      log.error("发送失败", error);
      if (data === "</stream:stream>") {
        log.warn("发送流关闭标签失败，可能是连接已断开");
      } else {
        this.disconnect();
      }
    }
  }

  send(data: string | XMPPElement): void {
    this.writeRaw(typeof data === "string" ? data : data.toXMLString());
  }

  sendAsync(stanza: XMPPElement, timeout = 30000): Promise<XMPPElement> {
    const id = stanza.getAttribute("id");
    if (!id) throw new XMPPError(stanza, "缺少id属性");

    return new Promise((resolve, reject) => {
      const onResponse = (response: XMPPElement) => {
        if (response.getAttribute("id") === id) {
          this.off("stanza", onResponse);
          clearTimeout(timer);
          resolve(response);
        }
      };

      this.on("stanza", onResponse);

      const timer = setTimeout(() => {
        this.off("stanza", onResponse);
        reject(new TimeoutError(`请求超时: ${id}`));
      }, timeout);

      this.send(stanza);
    });
  }

  /**
   * 升级到 TLS 连接
   * @deprecated
   */
  async upgradeToTLS(): Promise<void> {
    if (!this.socket || this.socket instanceof TLSSocket) {
      throw new Error("无效的socket状态");
    }
  }

  disconnect() {
    const closeXML = `</stream:stream>`;
    try {
      this.writeRaw(closeXML);
    } catch {
      // 连接可能已断开
    }
    log.info("关闭XMPP流");
    this.status = Status.SESSIONEND;
    this.emit("session:end");
    this.close();
  }

  private close(): void {
    if (this.bindTimer) clearTimeout(this.bindTimer);
    this.bindTimer = undefined;
    this.bindId = undefined;
    this.socket?.end();
    log.info("关闭tcp连接");
  }
}

export default XMPPConnection;