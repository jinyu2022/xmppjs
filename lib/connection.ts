import { JID } from "./JID";
import WebSocketClient from "./websocket";
import type { Protocol, Options } from "./types";
import { implementation } from "./shims";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

// 定义所有可能的事件参数类型
interface SocketEventMap {
  message: Element;
  iq: Element;
  presence: Element;
  "session:start": void;
}
// 扩展 EventEmitter 类型定义
export interface Connection extends EventEmitter {
  on<E extends keyof SocketEventMap>(
    event: E,
    listener: (arg: SocketEventMap[E]) => void
  ): this;

  emit<E extends keyof SocketEventMap>(
    event: E,
    arg?: SocketEventMap[E]
  ): boolean;
}
// type PluginTypes = {
//   [K in keyof PluginRegistry]: InstanceType<(typeof plugins)[K]>;
// };
// 2. 声明合并
declare module "./connection" {
  interface Connection extends PluginRegistry {}
}
export class Connection extends EventEmitter {
  jid: JID;
  password: string;
  /** 连接协议，xmpp仅node环境可用，目前仅实现了ws */
  protocol: Protocol = "ws";
  /** 连接的url，不要前缀 */
  address?: string;
  /** 连接的端口 */
  port?: string;
  /** 连接的路径 */
  path?: string;
  /** 连接的url */
  url?: string;
  /** 是否启用tls，在本地调试的时候您可能不需要，默认为true */
  tls = true;
  /* 当前的连接 */
  socket: WebSocketClient | null = null;
  /** 当前连接的服务器的功能 */
  // private features: Set<string> = new Set();
  // 插件
  // [plugin: keyof typeof plugins]: Plugin | undefined;
  [name: string]: any;

  /**
   * 创建一个连接
   * @param jid 完整的账号，例如：user@domain.com
   * @param password 密码
   * @param options 自定义配置，一般不需要配置，包括：
   *    - service为连接的url，不要前缀
   *    - protocol为连接协议，xmpp仅node环境可用，目前仅实现了ws
   *    - tls为是否启用tls，在本地调试的时候您可能不需要，默认为true
   */
  constructor(jid: string, password: string, options?: Options) {
    super();
    this.jid = new JID(jid);
    this.password = password;

    if (options?.protocol) {
      this.protocol = options.protocol;
    }
    if (options?.address) {
      this.address = options.address;
    } else {
      console.warn("未指定service，将尝试从域名获取");
    }
    if (options?.port) {
      this.port = options.port;
    } else {
      console.warn("未指定port，将使用默认端口");
    }
    if (options?.path) {
      this.path = options.path;
    }
    if (options?.tls) {
      this.tls = options.tls;
    }
    // 组合url
    if (this.address && this.protocol) {
      const prefix = this.tls ? `${this.protocol}s` : this.protocol;
      this.url = `${prefix}://${this.address}`;
      if (this.port) {
        this.url += `:${this.port}`;
      }
      if (this.path) {
        this.url += `/${this.path}`;
      }
    }
  }
  /**
   * 注册内置插件
   * @param name 内置插件名称
   */
  registerPlugin<T extends keyof typeof plugins>(
    name: T
  ): ReturnType<InstanceType<(typeof plugins)[T]>["init"]>;
  /**
   * 注册插件，如果是本库实现的插件，命名都是XEP0000格式，直接传入名称即可
   * 如果是自定义插件，需要传入插件构造函数
   * @param name 插件名称
   * @param fun 插件构造函数
   */
  registerPlugin(name: string, fun?: PluginConstructor) {
    // 在自身上注册插件
    if (name in plugins) {
      console.log(`注册插件 ${name}`);
      fun = plugins[name as keyof typeof plugins];
      this[name] = new fun(this);
    } else if (fun !== void 0) {
      this[name] = new fun(this);
    } else {
      throw new Error(`未找到插件 ${name}`);
    }
    return this[name].init();
  }

  connect() {
    if (this.protocol === "ws") {
      this.socket = new WebSocketClient(this.jid, this.password);
    } else if (this.protocol === "http") {
      throw new Error("暂不支持xbosh");
    } else {
      throw new Error("未知的协议");
    }

    const connectHandler = () => {
      if (this.url) {
        console.log("尝试连接", this.url);
        this.socket!.connect(this.url);
      } else {
        throw new Error("未指定url");
      }
      this.socket!.on("close", () => {
        console.log("连接已关闭");
        this.socket = null;
      });
      this.socket!.on("net:message", this.onMessage);
      // 协商流特性
      this.socket!.on("session:start", () => {
        this.socket?.send(
          '<presence xmlns="jabber:client"><show>dnd</show></presence>'
        );
        // 发送session:start事件
        this.emit("session:start");
        console.log("连接成功, 会话开始!");
      });
    };

    if (!this.url) {
      if (this.XEP0156) {
        console.log("存在插件，尝试使用XEP0156插件获取url");
        this.XEP0156.init()?.then(() => connectHandler());
      } else {
        throw new Error("未指定url");
      }
    } else {
      connectHandler();
    }
  }

  disconnect() {
    this.socket?.disconnect();
  }

  onMessage(message: string) {
    console.log(message);
    const stanza = new DOMParser().parseFromString(
      message,
      "text/xml"
    ).documentElement;

    // 解决愚蠢的类型检查
    if (stanza === null) throw new Error("stanza为空");

    if (stanza.tagName === "message") {
      this.emit("message", stanza);
    } else if (stanza.tagName === "iq") {
      this.emit("iq", stanza);
    } else if (stanza.tagName === "presence") {
      this.emit("presence", stanza);
    } else {
      console.log("其他stanza", stanza);
    }
  }

  send(stanza: Element) {
    // 检查必须的流属性
    // XXX: 我不清楚需要进行那些检查,多余, 或者缺失

    // 一个拥有特定接收者的节必须拥有一个'to'属性
    // 一个从客户端发送到服务器的由该服务器直接处理的节(例如, presence状态信息)不能拥有'to'属性
    if (stanza.tagName === "message" && !stanza.getAttribute("to")) {
      throw new Error("message stanza缺少to属性");
    }
    if (stanza.tagName === "iq" && !stanza.getAttribute("type")) {
      throw new Error("iq stanza缺少type属性");
    }
    // 如果没有, 服务器会自动填充, 但是我们应该尽量避免这种情况
    if (!stanza.getAttribute("from")) {
      stanza.setAttribute("from", this.jid.full);
    }
    if (!stanza.getAttribute("id")) {
      stanza.setAttribute("id", uuidv4());
    }
    if (!stanza.namespaceURI) {
      stanza.setAttribute("xmlns", "jabber:client");
    }
    // 一个节应该拥有'xml:lang'属性，如果这个节包含了XML字符串数据打算展示给用户
    if (stanza.tagName === "message" && !stanza.getAttribute("xml:lang")) {
      stanza.setAttribute("xml:lang", "en");
    }
    this.socket?.send(stanza);
  }

  /**
   * 发送一个stanza，返回一个Promise对象
   * @param stanza 要发送的stanza
   * @returns 一个Promise对象，仅在发送失败时reject
   */
  sendAsync(stanza: Element) {
    // 检查必须的流属性
    // XXX: 我不清楚需要进行那些检查,多余, 或者缺失

    // 一个拥有特定接收者的节必须拥有一个'to'属性
    // 一个从客户端发送到服务器的由该服务器直接处理的节(例如, presence状态信息)不能拥有'to'属性
    if (stanza.tagName === "message" && !stanza.getAttribute("to")) {
      throw new Error("message stanza缺少to属性");
    }
    if (stanza.tagName === "iq" && !stanza.getAttribute("type")) {
      throw new Error("iq stanza缺少type属性");
    }
    // 如果没有, 服务器会自动填充
    // if (!stanza.getAttribute("from")) {
    //   stanza.setAttribute("from", this.jid.full);
    // }
    if (!stanza.getAttribute("id")) {
      stanza.setAttribute("id", uuidv4());
    }
    if (!stanza.namespaceURI) {
      stanza.setAttribute("xmlns", "jabber:client");
    }
    // 一个节应该拥有'xml:lang'属性，如果这个节包含了XML字符串数据打算展示给用户
    if (stanza.tagName === "message" && !stanza.getAttribute("xml:lang")) {
      stanza.setAttribute("xml:lang", "en");
    }
    if (!this.socket) throw new Error("未连接");

    return this.socket.sendAsync(stanza);
  }

  createIq(
    type: "get" | "set" | "result" | "error",
    to?: JID | string,
    queryNS?: string
  ) {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement;
    iq.setAttribute("type", type);
    if (to) iq.setAttribute("to", to.toString());
    if (queryNS) {
      const query = doc.createElementNS(queryNS, "query");
      iq.appendChild(query);
    }
    return iq;
  }
  sendIq(
    type: "get" | "set" | "result" | "error",
    to: JID | string,
    queryNS?: string
  ) {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement;
    iq.setAttribute("type", type);
    iq.setAttribute("to", to.toString());
    if (queryNS) {
      const query = doc.createElementNS(queryNS, "query");
      iq.appendChild(query);
    }

    return this.sendAsync(iq);
  }
}

import { plugins } from "../lib/plugins/index";

type PluginRegistry = {
  [K in keyof typeof plugins]?: InstanceType<(typeof plugins)[K]>;
};

/** 一个具有init方法的构造函数类型*/
type PluginConstructor = new (connection: Connection) => {
  init: () => void;
};

export default Connection;
