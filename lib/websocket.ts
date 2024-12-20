import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { domParser, xmlSerializer, WS } from "./shims";
import { TimeoutError } from "./errors";
import type WebSocket from "ws";
import {
  generateSecureNonce,
  scramParseChallenge,
  scramDeriveKeys,
  scramClientProof,
} from "./auth/scram";
import { JID } from "./JID";
enum Status {
  /** 客户端未连接 */
  DISCONNECTED = 0,
  /** 正在连接到服务器 */
  CONNECTING = 1,
  /** 已成功连接到服务器 */
  CONNECTED = 2,
  /** 正在建立xmpp流 */
  STREAM_START = 3,
  /** xmpp流建立成功 */
  STREAM_ESTABLISHED = 4,
  /** 正在进行身份验证 */
  AUTHENTICATING = 5,
  /** 身份验证成功 */
  AUTHENTICATED = 6,
  /** 正在进行资源绑定 */
  BINDING = 7,
  /** 身份验证失败 */
  AUTHFAIL = 8,
  /** 会话已开始 */
  SESSIONSTART = 10,
  /** 正在重新连接 */
  RECONNECTING = 11,
  /** 已重新连接 */
  DISCONNECTING = 40,
  /** 发生错误 */
  ERROR = 41,
  /** 操作超时 */
  TIMEOUT = 42,
  /** 会话结束 */
  SESSIONEND = 43,
}

// 定义所有可能的事件参数类型
interface SocketEventMap {
  connect: void;
  disconnect: WebSocket.CloseEvent;
  error: Error;
  authenticated: void;
  "stream:start": void;
  "stream:end": void;
  // stanza: { name: string; attrs: Record<string, string>; children: any[] };
  "net:message": string;
  "session:start": void;
  [event: string | symbol]: unknown;
}

// 扩展 EventEmitter 类型定义
export interface WebSocketClient extends EventEmitter {
  on<E extends keyof SocketEventMap>(
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
export class WebSocketClient extends EventEmitter {
  private readonly jid: JID;
  private readonly password: string;
  private ws: WebSocket | null = null;
  private url: string = "";
  private status: Status = Status.DISCONNECTED;
  clientFirstMessageBare?: string;
  resource = "xmppjs.uig48";
  constructor(jid: JID, password: string) {
    super();
    this.jid = jid;
    this.resource = jid.resource ?? Math.random().toString(32).slice(2, 8);
    this.password = password;
  }

  connect(url: string) {
    this.url = url;
    this.ws = new WS(url, "xmpp");
    console.log("connecting", url);
    this.ws.onopen = (ev) => this.onOpen(ev);
    this.ws.onclose = (ev) => this.onClose(ev);
    this.ws.onmessage = (ev) => this.onMessage(ev);
    this.ws.onerror = (ev) => this.onError(ev);
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
      throw new Error("未连接到服务器");
      // 1 表示连接已经建立
    } else if (this.ws.readyState !== 1) {
      console.log("send", data);
      throw new Error("连接未打开");
    } else if (xml.getAttribute("id") === null) {
      xml.setAttribute("id", uuidv4());
    }
    console.log("send", xmlSerializer.serializeToString(xml));
    this.ws.send(xmlSerializer.serializeToString(xml));
  }

  /** 返回一个promise，用于接受响应
   * @param xml 要发送的xml
   * @param timeout 超时时间，默认30s
   * @returns 返回一个promise，用于接受响应，仅在超时或者发送失败时reject
   */
  sendAsync(xml: Element, timeout = 30000) {
    // 检查xml是否合法
    console.log("id", xml.getAttribute("id"));
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
    console.log("open");
    // 发送xmpp流的xml
    // 获取当前的域
    this.status = Status.CONNECTED;
    const domain = new URL(this.url).hostname;
    const openXML = `<open to="${domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`;
    this.send(openXML);
    this.status = Status.STREAM_START;
  }

  onClose(ev: WebSocket.CloseEvent) {
    this.status = Status.DISCONNECTED;
    this.emit("disconnect", ev);
    console.log("ws连接close", ev.code, ev.reason);
  }

  onMessage(ev: WebSocket.MessageEvent) {
    // console.log("message", ev.data);
    if (this.status < Status.SESSIONSTART) {
      // 如果还没有开始会话，就准备会话
      this.prepareSession(ev.data as string);

      this.emit("net:message", ev.data as string);
    } else {
      // 如果已经开始会话，就直接触发事件
      this.emit("net:message", ev.data as string);
    }
  }

  onError(ev: WebSocket.ErrorEvent) {
    console.error("error", ev);
  }

  private async prepareSession(data: string) {
    if (this.status === Status.STREAM_START) {
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
        data.includes("http://etherx.jabber.org/streams")
      ) {
        // 开始认证
        const xml = domParser.parseFromString(data, "text/xml").documentElement!;
        // 获取所有的 mechanism 元素
        const mechanisms = xml.getElementsByTagName("mechanism");

        /* 安全等级映射 */
        const securityLevels = {
          "X-OAUTH2": 1, // 最低安全性
          PLAIN: 2, // 中等安全性
          "SCRAM-SHA-1": 3, // 最高安全性
        } as const;
        // 提取机制名称并排序
        const supportedMechanisms = Array.from(mechanisms)
          .map((mechanism) => mechanism.textContent)
          .sort(
            (a, b) =>
              (securityLevels[a as keyof typeof securityLevels] ?? 0) -
              (securityLevels[b as keyof typeof securityLevels] ?? 0)
          );

        // 选择PLAIN
        const selectedMechanism = "PLAIN";
        console.log("selectedMechanism", selectedMechanism);
        const auth = btoa(`\0${this.jid.node}\0${this.password}`);
        console.log("auth", auth);
        const authXML = `<auth mechanism="${selectedMechanism}" xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${auth}</auth>`;
        this.send(authXML);
        this.status = Status.AUTHENTICATING;
      }
      return;
    }
    if (this.status === Status.AUTHENTICATING) {
      // console.log("challenge", data)
      if (data.includes("challenge")) {
        const challenge = domParser.parseFromString(
          data,
          "text/xml"
        ).documentElement!;
        const serverFirstMessage = challenge.textContent;
        // 解析base64成字符串
        const serverFirstMessageStr = Buffer.from(
          serverFirstMessage!,
          "base64"
        ).toString();

        console.log("serverFirstMessage", serverFirstMessage);
        const parsed = scramParseChallenge(serverFirstMessageStr);
        if (!parsed) {
          throw new Error("解析失败");
        }
        // 生成客户端响应
        const { nonce, salt, iter } = parsed;
        const { ck, sk } = await scramDeriveKeys(
          this.password,
          salt,
          iter,
          "SHA-1",
          160
        );
        const clientFinalMessageBare = `c=biws,r=${nonce}`;
        const authMessage = `${this.clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;
        console.log("authMessage", authMessage);
        const clientProof = await scramClientProof(authMessage, ck, "SHA-1");
        // 将 ArrayBuffer 转换为 base64 字符串
        const proofBase64 = Buffer.from(clientProof).toString("base64");
        const clientFinalMessage = `${clientFinalMessageBare},p=${proofBase64}`;
        // 发送响应
        const responseXML = `<response xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${Buffer.from(
          clientFinalMessage
        ).toString("base64")}</response>`;
        this.send(responseXML);
      } else if (data.includes("success")) {
        // 认证成功
        this.status = Status.AUTHENTICATED;
        // 重新发送open标签
        const domain = new URL(this.url).hostname;
        const openXML = `<open to="${domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`;
        this.send(openXML);
        // 发送流的结束标签
        console.log(data);
      }
      return;
    }
    if (this.status === Status.AUTHENTICATED) {
      if (data.includes("stream:features")) {
        const xml = `<iq id="_bind_auth_2" type="set" xmlns="jabber:client" to="${this.jid.domain}"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>${this.resource}</resource></bind></iq>`;
        const xmlElement = domParser.parseFromString(
          xml,
          "text/xml"
        ).documentElement!;
        this.sendAsync(xmlElement).then((response) => {
          // 获取jid标签的connentText
          const jid = response.getElementsByTagName("jid")[0].textContent;
          if (jid === `${this.jid}${this.resource}`) {
            console.log("绑定成功", `${this.jid}${this.resource}`);
            // console.log()
            this.emit("session:start");
            this.status = Status.SESSIONSTART;
            // 发送在线状态，开始接受消息
          } else {
            console.error("绑定失败", jid);
          }
        });
      }
    }
  }

  // /**
  //  * 添加响应监听器
  //  * @param filter 过滤条件，包括 `id` 和 `tagName`
  //  * @param callback 响应回调函数，当接收到符合条件的响应时调用
  //  * @param option 可选对象，包含 `once` 属性，表示是否只触发一次
  //  */
  // private responseListener(
  //   filter: { id?: string; tagName?: "message" | "iq" | "presence" },
  //   callback: (response: Element) => void,
  //   option: { once: boolean } = { once: false }
  // ) {
  //   // 用于监听响应，返回相应的响应
  //   // 使用 EventEmitter 触发事件
  //   const eventName = `xmpp:${filter.id ?? "*"}:${filter.tagName ?? "*"}`;
  //   const handler = (ev: MessageEvent) => {
  //     try {
  //       const response = domParser.parseFromString(
  //         ev.data,
  //         "text/xml"
  //       ).documentElement;
  //       const resId = response.getAttribute("id");
  //       const resTagName = response.tagName;

  //       const idMatch = filter.id ? resId === filter.id : true;
  //       const tagMatch = filter.tagName ? resTagName === filter.tagName : true;

  //       if (idMatch && tagMatch) {
  //         // 发出事件
  //         this.emit(eventName, response);
  //       }
  //     } catch (error) {
  //       console.error("解析 XML 失败");
  //       this.ws!.removeEventListener("message", handler);
  //     }
  //   };
  //   // 添加WS事件监听器
  //   this.ws!.addEventListener("message", handler);
  //   // 添加EventEmitter监听器
  //   if (option.once) {
  //     this.once(eventName, callback);
  //   } else {
  //     this.on(eventName, callback);
  //   }
  // }

  // /**
  //  * 移除响应监听器
  //  * @param filter 过滤条件，包括 `id` 和 `tagName`
  //  * @param callback 响应回调函数，当接收到符合条件的响应时调用
  //  */
  // private removeResponseListener(
  //   filter: { id?: string; tagName?: "message" | "iq" | "presence" },
  //   callback: (response: Element) => void
  // ) {
  //   // 构造事件名称，与 responseListener 中的格式保持一致
  //   const eventName = `xmpp:${filter.id ?? "*"}:${filter.tagName ?? "*"}`;

  //   // 移除 EventEmitter 监听器
  //   this.off(eventName, callback);
  // }

  /** 关闭ws连接 */
  private close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** 关闭xmpp流 */
  disconnect() {
    // 发送关闭流的xml
    const closeXML = `<close xmlns='urn:ietf:params:xml:ns:xmpp-framing'/>`;
    this.send(closeXML);
    // 关闭ws连接
    this.close();
    this.status = Status.DISCONNECTED;
    // 关闭事件
    this.removeAllListeners();
    this.ws = null;
    console.log("关闭连接");
  }
}

export default WebSocketClient;
