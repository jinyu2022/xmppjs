import { EventEmitter } from "events";
import { domParser, xmlSerializer, getWebSocket } from "../shims";
import { EntityCaps, Capabilities } from "@/plugins/xep0115/entityCaps";
import { TimeoutError, XMPPError } from "../errors";
import { Status, SaslData } from "./typing";
import { scramResponse, generateSecureNonce } from "../auth/scram";
import type WebSocket from "ws";
import { JID } from "../JID";
import logger from "@/log";
const log = logger.getLogger("WS");

// 定义所有可能的事件参数类型
interface SocketEventMap {
  connect: void;
  disconnect: WebSocket.CloseEvent;
  error: Error;
  /** 认证完成，但还没有重启流 */
  authenticated: void;
  "stream:start": void; 
  "stream:end": void;
  // stanza: { name: string; attrs: Record<string, string>; children: any[] };
  "net:message": string;
  "stream:negotiated": void;
  "session:start": void;
  "session:end": void;
  binded: void;
  // [event: string | symbol]: unknown;
}

// 扩展 EventEmitter 类型定义
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface WSConnection {
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

  // // 泛型事件处理
  // on(event: string | symbol, listener: (...args: any[]) => void): this;
  // emit(event: string | symbol, ...args: any[]): boolean;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class WSConnection extends EventEmitter {
  private readonly jid: JID;
  private readonly password: string;
  private readonly domain: string;
  private ws: WebSocket | null = null;
  private url?: string;
  status: Status = Status.DISCONNECTED;
  /** 流特性 */
  streamFeatures: Set<string> = new Set();
  entityCaps?: Capabilities;
  private readonly sasl: SaslData = {};
  resource = "xmppjs.uig48";
  constructor(jid: JID, password: string) {
    super();
    this.jid = jid;
    this.domain = jid.domain;
    this.resource = jid.resource ?? Math.random().toString(32).slice(2, 8);
    this.password = password;
  }

  async connect(url?: string) {
    if (url){
      this.url = url;
    }
    if (!this.url) throw Error("缺少url")
    const WS = await getWebSocket();
    this.ws = new WS(this.url, "xmpp");
    log.debug("connecting", url);
    this.ws.onopen = (ev) => this.onOpen(ev);
    this.ws.onclose = (ev) => this.onClose(ev);
    this.ws.onmessage = (ev) => this.onMessage(ev);
    this.ws.onerror = (ev) => this.onError(ev);
    return Promise.resolve();
  }

  send(data: Element | string) {
    let xml: Element;
    if (typeof data === "string") {
      const parse = domParser.parseFromString(data, "text/xml");
      if (!parse.documentElement) {
        throw new Error("xml格式错误");
      } else {
        xml = parse.documentElement;
      }
    } else {
      xml = data;
    }

    if (!this.ws) {
      throw new XMPPError(xml, "未连接到服务器");
      // 1 表示连接已经建立
    } else if (this.ws.readyState !== 1) {
      log.debug("send", data);
      throw new Error("连接未打开");
    }
    log.debug("send", xmlSerializer.serializeToString(xml));
    this.ws.send(xmlSerializer.serializeToString(xml));
  }

  /** 返回一个promise，用于接受响应
   * @param xml 要发送的xml
   * @param timeout 超时时间，默认30s
   * @returns 返回一个promise，用于接受响应，仅在超时或者发送失败时reject
   * @throws 超时时抛出 TimeoutError
   */
  sendAsync(xml: Element, timeout = 30000) {
    // 检查xml是否合法
    log.debug("id", xml.getAttribute("id"));
    if (!xml.getAttribute("id")) {
      throw new Error("没有id");
    }
    // if (!xml.getAttribute("to")) {
    //   throw new Error("没有to");
    // }
    return new Promise<Element>((resolve, reject) => {
      const id = xml.getAttribute("id");

      const onResponse = (response: string) => {
        const resElement = domParser.parseFromString(response, "text/xml")
          .documentElement!;
        const responseId = resElement.getAttribute("id");
        if (responseId && responseId === id) {
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

  onOpen(_ev: WebSocket.Event) {
    log.debug("open");
    // 发送xmpp流的xml
    // 获取当前的域
    this.status = Status.CONNECTED;
    const openXML = `<open to="${this.domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`;
    this.send(openXML);
    this.status = Status.STREAM_START;
  }

  onClose(ev: WebSocket.CloseEvent) {
    // this.ws = null;
    if (this.status !== Status.SESSIONEND) {
      this.status = Status.SESSIONEND;
      log.info("发出会话结束事件");
      this.emit("session:end");
    }
    // 移除事件
    // this.removeAllListeners();
    this.status = Status.DISCONNECTED;
    log.debug("ws连接close", ev.code, ev.reason);
    this.emit("disconnect", ev);
  }

  onMessage(ev: WebSocket.MessageEvent) {
    log.debug("revice", ev.data);
    if (this.status < Status.BINDING) {
      // 如果还没有开始会话，就准备会话
      if ((ev.data as string).includes("stream:features")) {
        this.parseStreamFeatures(ev.data as string);
      }
      this.prepareSession(ev.data as string);

      // this.emit("net:message", ev.data as string);
    } else {
      // 如果已经开始会话，就直接触发事件
      if ((ev.data as string).includes("stream:features")) {
        this.parseStreamFeatures(ev.data as string);
        this.emit("stream:negotiated");
      }
      this.emit("net:message", ev.data as string);
    }
  }

  onError(ev: WebSocket.ErrorEvent) {
    log.error("error", ev);
  }

  /**
   * 解析流特性
   */
  private parseStreamFeatures(data: string) {
    const features = domParser.parseFromString(data, "text/xml")
      .documentElement!;
    for (const feature of features.childNodes) {
      if (feature.namespaceURI) {
        this.streamFeatures.add(feature.namespaceURI);
        if (feature.namespaceURI === EntityCaps.NS) {
          this.entityCaps = EntityCaps.parseCaps(feature as Element).cap;
        }
      }
    }
  }

  private async prepareSession(data: string) {
    if (this.status === Status.STREAM_START) {
      log.info("建立流");
      // 发送open标签在onOpen中，这里接收open标签证明已经建立了xmpp流
      if (data.includes("urn:ietf:params:xml:ns:xmpp-framing")) {
        // 开始会话
        this.status = Status.STREAM_ESTABLISHED;
      }
      return;
    }
    if (this.status === Status.STREAM_ESTABLISHED) {
      if (
        data.includes("stream:features") &&
        data.includes("urn:ietf:params:xml:ns:xmpp-sasl")
      ) {
        // 开始认证
        const xml = domParser.parseFromString(data, "text/xml")
          .documentElement!;
        // 获取所有的 mechanism 元素
        const mechanisms = xml.getElementsByTagName("mechanism");

        /* 安全等级映射 */
        const securityLevels = {
          PLAIN: 1, // 中等安全性
          "SCRAM-SHA-1": 2, // 最高安全性
        } as const;
        // 提取机制名称并排序
        const supportedMechanisms = Array.from(mechanisms)
          .map((mechanism) => mechanism.textContent)
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
    }
    if (this.status < Status.BINDED) {
      if (this.sasl.mechanism === "PLAIN") {
        this.plainAuth(data);
      } else {
        this.scramAuth(data);
      }
    }
    if (this.status === Status.AUTHENTICATED) {
      this.bindResource(data);
    }
  }

  private async scramAuth(data: string) {
    log.info(data, this.status);
    if (this.status === Status.STREAM_ESTABLISHED) {
      this.sasl.clientFirstMessageBare = `n=${
        this.jid.local
      },r=${generateSecureNonce()}`;
      const auth = `<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='SCRAM-SHA-1'>${btoa(
        `n,,${this.sasl.clientFirstMessageBare}`
      )}</auth>`;
      this.send(auth);
      this.status = Status.AUTHENTICATING;
    } else if (this.status === Status.AUTHENTICATING) {
      log.debug("scramAuth", data);
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
        log.debug("v", v);

        if (v !== this.sasl.serverProof) {
          log.debug(this.sasl.serverProof);
          // 关闭连接
          this.disconnect();
          throw new Error("服务器签名不匹配");
        }
        log.info("认证成功");
        this.status = Status.AUTHENTICATED;
        this.emit("authenticated");
        // 重新开始xmpp流
        const openXML = `<open to="${this.domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`;
        this.send(openXML);
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
        `\x00${this.jid.local}\x00${this.password}`
      )}</auth>`;
      this.send(auth);
      this.status = Status.AUTHENTICATING;
    } else if (this.status === Status.AUTHENTICATING) {
      if (data.includes("success")) {
        this.status = Status.AUTHENTICATED;
        log.info("认证成功");
        this.emit("authenticated");
        // 重新开始xmpp流
        const openXML = `<open to="${this.domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`;
        this.send(openXML);
      } else if (data.includes("failure")) {
        this.status = Status.AUTHFAIL;
        this.disconnect();
        throw new Error("认证失败");
      }
    }
  }

  private bindResource(data: string) {
    if (
      data.includes("urn:ietf:params:xml:ns:xmpp-bind") &&
      this.status === Status.AUTHENTICATED
    ) {
      this.status = Status.BINDING;
      const bind = `<iq type='set' id='bind-resource' to="${this.jid.domain}"><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>${this.resource}</resource></bind></iq>`;
      const bindEL = domParser.parseFromString(bind, "text/xml")
        .documentElement!;
      log.info("开始绑定资源");
      this.sendAsync(bindEL).then((response) => {
        // 获取jid标签的connentText
        const jid = response.getElementsByTagName("jid")[0].textContent;
        if (jid === `${this.jid.bare}/${this.resource}`) {
          log.info("资源绑定成功", jid);
          this.emit("binded");
          this.status = Status.BINDED;

          // 发送在线状态，开始接受消息，由connection类完成
        } else {
          log.error("绑定失败", jid);
        }
      });
    }
  }

  /** 关闭ws连接 */
  private close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  /** 关闭xmpp流 */
  disconnect() {
    // 发送关闭流的xml
    const closeXML = `<close xmlns='urn:ietf:params:xml:ns:xmpp-framing'/>`;
    this.send(closeXML);
    // 关闭ws连接
    this.close();
    log.debug("关闭连接");
  }
}

export default WSConnection;
