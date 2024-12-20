import { JID } from "./JID";
import WebSocketClient from "./websocket";
import type { Protocol, Options } from "./types";
import { domParser, implementation } from "./shims";
import { XMPPError, TimeoutError } from "./errors";
import { Message, Iq, Presence, StanzaBase } from "./stanza";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
interface StanzaHandlerMap {
  message: (message: Message) => void;
  iq: (iq: Iq) => void;
  presence: (presence: Presence) => void;
  others: (other: StanzaBase) => void;
}

// type StanzaPlugins = {
//   [K in keyof StanzaHandlerMap]: StanzaHandlerMap[K][];
// };

// type StanzaPlugins = {

// }

interface EventHandlerMap {
  message: (message: Message) => boolean;
  iq: (iq: Iq) => boolean;
  presence: (presence: Presence) => boolean;
  others: (other: StanzaBase) => boolean;
}
// 事件插件映射类型
interface EventPluginMap<K extends keyof EventHandlerMap> {
  eventName: keyof SocketEventMap;
  matcher: EventHandlerMap[K];
}
interface StanzaInstanceMap {
  message: Message;
  iq: Iq;
  presence: Presence;
  others: StanzaBase;
}
// 定义所有可能的事件参数类型
export interface SocketEventMap {
  stanza: Element;
  message: Message;
  iq: Iq;
  presence: Presence;
  others: StanzaBase;
  "session:start": void;
  // [key: string | symbol]: unknown;
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
export interface Connection extends PluginRegistry {}

export class Connection extends EventEmitter {
  jid: JID;
  password: string;
  /** 连接协议，xmpp仅node环境可用，目前仅实现了ws */
  protocol: Protocol = "ws";
  /** 连接的url，不要前缀 */
  host?: string;
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
  private readonly pendingPlugins = new Map<string, PluginConstructor>();

  /** stanza处理插件，键是NS，值是函数 */
  private readonly stanzaPlugins = new Map<
    string,
    (stanza: Element) => Record<string, unknown>
  >([]);

  private readonly eventPlugins: {
    [K in keyof EventHandlerMap]: EventPluginMap<K>[];
  } = {
    message: [],
    iq: [],
    presence: [],
    others: [],
  } as const;

  // [plugin: keyof typeof plugins]: Plugin | undefined;
  [name: string]: unknown;

  /**
   * 创建一个连接
   * @param jid 完整的账号，例如：user@domain.com
   * @param password 密码
   * @param options 自定义配置，一般不需要配置，包括：
   *    - host为连接的url，不要前缀
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
    if (options?.host) {
      this.address = options.host;
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
    if (this.host && this.protocol) {
      const prefix = this.tls ? `${this.protocol}s` : this.protocol;
      this.url = `${prefix}://${this.host}`;
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
  registerPlugin<T extends keyof typeof plugins>(name: T): void;
  /**
   * 注册插件，如果是本库实现的插件，命名都是XEP0000格式，直接传入名称即可
   * 如果是自定义插件，需要传入插件构造函数
   * @param name 插件名称
   * @param fun 插件构造函数
   */
  registerPlugin(name: string, func?: PluginConstructor) {
    // 在自身上注册插件
    if (name in plugins) {
      console.log(`注册插件 ${name}`);
      func = plugins[name as keyof typeof plugins];
      this.pendingPlugins.set(name, func);
    } else if (func !== void 0) {
      this.pendingPlugins.set(name, func);
    } else {
      throw new Error(`未找到插件 ${name}`);
    }
  }

  // 在连接前调用
  private initPlugins() {
    // 按顺序初始化所有插件
    for (const [name, func] of this.pendingPlugins) {
      this[name] = new func(this);
    }
    for (const [name, _] of this.pendingPlugins) {
      (this[name] as InstanceType<PluginConstructor>).init();
    }
  }
  /**
   * 注册stanza处理插件
   * @param NS 命名空间
   * @param handler 处理函数
   */
  registerStanzaPlugin(NS: string, handler: (stanza: Element) => Record<string, unknown>) {
    this.stanzaPlugins.set(NS, handler);
  }

  /**
   * 注册事件插件
   * @template K "message" | "iq" | "presence" | "others"
   * @param eventName 事件名称
   * @param option 选项
   * @param option.tagName 标签名
   * @param option.matcher 匹配器，返回true则触发事件
   */
  registerEventPlugin<K extends keyof EventHandlerMap>(
    eventName: keyof SocketEventMap,
    option: {
      tagName: K;
      matcher: EventHandlerMap[K];
    }
  ) {
    const { tagName, matcher } = option;
    this.eventPlugins[tagName].push({ eventName, matcher });
  }

  connect() {
    // 初始化插件
    this.initPlugins();
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
      this.socket!.on("net:message", (message) => this.onMessage(message));
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
    // 清除所有监听器
    this.removeAllListeners();
    this.socket?.disconnect();
    // 清除所有插件
    for (const [name, _] of this.pendingPlugins) {
      delete this[name];
    }
    // 清除所有事件插件
    for (const [_, plugins] of Object.entries(this.eventPlugins)) {
      plugins.length = 0;
    }
    // 清除所有stanza插件
    this.stanzaPlugins.clear();
  }

  onMessage(message: string) {
    console.log("receive", message);
    const stanza = domParser.parseFromString(message, "text/xml")
      .documentElement!;

    this.emit("stanza", stanza);

    const tagName = ["message", "iq", "presence"].includes(stanza.tagName)
      ? (stanza.tagName as keyof StanzaHandlerMap)
      : "others";
    const stanzaInstance = this.stanzaInstanceFactory(stanza);
    this.emit(tagName, stanzaInstance);
  }

  private stanzaInstanceFactory(stanza: Element) {
    const tagName = ["message", "iq", "presence"].includes(stanza.tagName)
      ? (stanza.tagName as keyof StanzaHandlerMap)
      : "others";

    let stanzaInstance;

    if (tagName === "message") {
      stanzaInstance = new Message(stanza, this);
      for (const eventPlugin of this.eventPlugins[tagName]) {
        if (eventPlugin.matcher(stanzaInstance)) {
          this.emit(eventPlugin.eventName, stanzaInstance);
        }
      }
    } else if (tagName === "iq") {
      stanzaInstance = new Iq(stanza, this);
    } else if (tagName === "presence") {
      stanzaInstance = new Presence(stanza, this);
    } else {
      stanzaInstance = new StanzaBase(stanza, this);
    }

    this.traverseAndTransform(stanzaInstance);
    return stanzaInstance;
  }

  /**
   * 把stanza中的所有子节点传递给插件处理成对象
   * 会直接修改原对象
   * @param obj stanza对象
   * @returns 返回obj
   */
  private traverseAndTransform(obj: Record<string, unknown>) {
    // HACK：使用 instanceof Element 我无法做到同时兼容浏览器和node环境
    for (const [key, value] of Object.entries(obj)) {
      if (!value || typeof value !== "object" || Array.isArray(obj)) continue;
      // console.log(key);
      if (this.stanzaPlugins.has((value as Element).namespaceURI ?? "")) {
        const handler = this.stanzaPlugins.get(
          (value as Element).namespaceURI!
        )!;
        const transformed = handler(value as Element);
        this.traverseAndTransform(transformed);
        // 重新赋值
        delete obj[key];
        Object.assign(obj, transformed)
      }
    }
    return obj;
  }

  send(stanza: Element) {
    // 检查必须的流属性
    // XXX: 我不清楚需要进行那些检查,多余, 或者缺失

    // 一个拥有特定接收者的节必须拥有一个'to'属性
    // 一个从客户端发送到服务器的由该服务器直接处理的节(例如, presence状态信息)不能拥有'to'属性
    if (stanza.tagName === "message" && !stanza.getAttribute("to")) {
      throw new XMPPError(stanza, "message stanza缺少to属性");
    }
    if (stanza.tagName === "iq" && !stanza.getAttribute("type")) {
      throw new XMPPError(stanza, "iq stanza缺少type属性");
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
    this.socket?.send(stanza);
  }

  /**
   * 发送一个stanza，返回一个Promise对象
   * @param stanza 要发送的stanza
   * @param timeout 超时时间，默认30秒
   * @returns 一个Promise对象，仅在发送失败时reject
   */
  sendAsync(stanza: Element, timeout = 30000) {
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

    return this.socket.sendAsync(stanza, timeout);
  }

  /**
   * 创建一个presence节
   * @param to 接收者
   * @param type 类型
   *   - subscribe 订阅
   *   - unsubscribe 取消订阅
   *   - unavailable 下线
   *   - subscribed 订阅成功
   *   - unsubscribed 取消订阅成功
   */
  createPres(
    to: string | JID,
    type?:
      | "subscribe"
      | "unsubscribe"
      | "unavailable"
      | "subscribed"
      | "unsubscribed"
  ) {
    const pre = implementation.createDocument(
      "jabber:client",
      "presence",
      null
    );
    pre.documentElement!.setAttribute("to", to.toString());
    if (type) pre.documentElement!.setAttribute("type", type);
    return pre;
  }

  createIq(
    type: "get" | "set" | "result" | "error",
    to?: JID | string,
    queryNS?: string
  ) {
    const doc = implementation.createDocument("jabber:client", "iq", null);
    const iq = doc.documentElement!;
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
    const iq = doc.documentElement!;
    iq.setAttribute("type", type);
    iq.setAttribute("to", to.toString());
    if (queryNS) {
      const query = doc.createElementNS(queryNS, "query");
      iq.appendChild(query);
    }

    return this.sendAsync(iq);
  }

  getRoster() {
    return this.RFC6121!.getRoster();
  }

  setRoster(jid: string, name?: string, group?: string) {
    return this.RFC6121!.setRoster(jid, name, group);
  }

  removeRoster(jid: string) {
    return this.RFC6121!.removeRoster(jid);
  }
  
  /**
   * 一次性消息节监听处理器
   * @param id 消息id
   * @param callback 回调函数
   * @param option 选项
   */
  private stanzaListener(
    id: string,
    callback: (stanza: Element) => void,
    timeout?: number
  ): void;

  /**
   * 一次性消息节监听处理器
   * @param filter 过滤器函数
   * @param callback 回调函数
   */
  private stanzaListener(
    filter: (stanza: Element) => boolean,
    callback: (stanza: Element) => void,
    timeout?: number
  ): void;

  private stanzaListener(
    filter: string | ((stanza: Element) => boolean),
    callback: (stanza: Element) => void,
    timeout = 30000
  ) {
    // 定义处理函数
    const handler = (stanza: Element) => {
      const isMatch =
        typeof filter === "string"
          ? stanza.getAttribute("id") === filter
          : filter(stanza);

      if (isMatch) {
        callback(stanza);
        this.off("stanza", handler);
        clearTimeout(timerID);
      }
    };
    const timerID = setTimeout(() => {
      this.off("stanza", handler);
      return new TimeoutError("stanza监听超时");
    }, timeout);
    // 注册监听器
    this.on("stanza", handler);
  }

  /**
   * 消息节监听移除器
   * @param callback 回调函数
   *
   */
  removeStanzaListener(callback: (stanza: Element) => void) {
    this.off("stanza", callback);
  }
}

import { plugins } from "../lib/plugins/index";
import { getRandomValues } from "crypto";

type PluginRegistry = {
  [K in keyof typeof plugins]?: InstanceType<(typeof plugins)[K]>;
};

/** 一个具有init方法的构造函数类型*/
type PluginConstructor = new (connection: Connection) => {
  init: () => void;
};

export default Connection;
