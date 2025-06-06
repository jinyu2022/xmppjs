import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { domParser, implementation } from "./shims";
import { XMPPError, TimeoutError } from "./errors";
import { JID } from "./JID";
import logger from "./log";
import { Message, Iq, Presence, StanzaBase } from "./stanza";
import type WSConnection from "./transport/websocket";
import type XMPPConnection from "./transport/tcp";
import type { Protocol, Options } from "./types";
import { Element as E } from "@xmldom/xmldom";
const log = logger.getLogger("connection");

interface StanzaHandlerMap {
  message: (message: Message) => void;
  iq: (iq: Iq) => void;
  presence: (presence: Presence) => void;
  others: (other: StanzaBase) => void;
}

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

// 定义所有可能的事件参数类型
export interface SocketEventMap {
  stanza: Element;
  message: Message;
  iq: Iq;
  presence: Presence;
  others: StanzaBase;
  connect: void;
  "session:start": void;
  "session:end": void;
  disconnect: void;
}
// 扩展 EventEmitter 类型定义
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface Connection extends PluginRegistry {
  on<E extends keyof SocketEventMap>(
    event: E,
    listener: (arg: SocketEventMap[E]) => void
  ): this;

  off<E extends keyof SocketEventMap>(
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
}
// 声明合并
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
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
  /** xml缓冲区 */
  xmlBuffer = "";
  /**
   * 当前的连接实例
   * @warrning 你要知道你自己在做什么
   */
  socket: XMPPConnection | WSConnection | null = null;
  /** 插件列表，键是插件名 */
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

  private readonly interceptors: Map<
    "send" | "receive",
    Array<(stanza: Element) => Element>
  > = new Map([
    ["send", []],
    ["receive", []],
  ]);
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
      this.host = options.host;
    } else {
      log.debug("未指定service，将尝试从域名获取");
    }
    if (options?.port) {
      this.port = options.port;
    } else {
      log.info("未指定port，将使用默认端口");
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
      log.debug(`注册插件 ${name}`);
      func = plugins[name as keyof typeof plugins];
      this.pendingPlugins.set(name, func);
    } else if (func !== void 0) {
      this.pendingPlugins.set(name, func);
    } else {
      throw new Error(`未找到插件 ${name}`);
    }
  }

  private checkAndRegisterDep(name: string) {
    // 先检查依赖
    const func: PluginConstructor = plugins[name as keyof typeof plugins];
    for (const dep of func.dependencies ?? []) {
      if (!this.pendingPlugins.has(dep)) {
        log.warn(`${name} 需要 ${dep} 插件，现在自动注册`);
        this.registerPlugin(dep);
        this.checkAndRegisterDep(dep);
      }
    }
  }
  /** 注册插件 */
  private initPlugins() {
    // 先检查依赖
    for (const [name, _] of Array.from(this.pendingPlugins)) {
      this.checkAndRegisterDep(name);
    }
    // 按顺序初始化所有插件
    for (const [name, func] of this.pendingPlugins) {
      this[name] = new func(this);
    }
    for (const [name, _] of this.pendingPlugins) {
      (this[name] as InstanceType<PluginConstructor>).init();
    }
  }

  /**
   * 卸载插件，会自动卸载依赖于该插件的插件，应该由插件自己调用
   * 他只是帮你卸载依赖，记得自己取消监听器
   * @experimental 问题很大，你还需要卸载各种节处理器和事件处理器
   * @param name 插件名称，XEP0000格式
   */
  deregisterPlugin(name: keyof typeof plugins) {
    const plugin = this[name];
    if (!plugin) return;
    // 查找依赖于该插件的插件
    for (const [n, p] of this.pendingPlugins) {
      if (p.dependencies?.includes(name)) {
        this.deregisterPlugin(n as keyof typeof plugins);
      }
    }
    // 使用Proxy创建错误处理器
    // HACK: 如果要卸载我不得不忽略readonly属性
    // @ts-expect-error 仅仅是为了在运行时提醒你插件已卸载
    this[name] = new Proxy(
      {},
      {
        get() {
          throw new Error(`Plugin ${name} has been unregistered`);
        },
      }
    );
    // 从待处理插件列表中移除
    this.pendingPlugins.delete(name);
  }
  /**
   * 注册stanza处理插件
   * @param NS 命名空间
   * @param handler 处理函数
   */
  registerStanzaPlugin(
    NS: string,
    handler: (stanza: Element) => Record<string, unknown>
  ) {
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

  /** 注册拦截器
   * 也许以后会有更多功能，但目前只是为了流管理
   * @param type 拦截类型
   * @param handler 拦截处理器
   */
  registerInterceptor(
    type: "send" | "receive",
    handler: (stanza: Element) => Element
  ) {
    this.interceptors.get(type)!.push(handler);
    log.info(`注册拦截器 ${type}`);
  }

  async connect() {
    if (
      this.protocol !== "xmpp" &&
      !this.url &&
      !this.pendingPlugins.has("XEP0156")
    ) {
      throw new Error("未指定 url");
    } else if (
      this.protocol !== "xmpp" &&
      !this.url &&
      this.pendingPlugins.has("XEP0156")
    ) {
      log.debug("存在插件，尝试使用XEP0156插件获取url");

      this.socket = (await this.createSocket()) as WSConnection;
      this._setupSocketEvents();
      this.initPlugins();
      await this.XEP0156!.init();
      this.socket.connect(this.url);
    } else {
      this.socket = (await this.createSocket()) as XMPPConnection;
      this.initPlugins();
      this.socket.connect(this.url);
      this._setupSocketEvents();
    }
  }

  private async createSocket() {
    if (this.protocol === "ws" && typeof WebSocket !== "undefined") {
      const WSConnection = (await import("./transport/websocket")).default;
      return new WSConnection(this.jid, this.password);
    } else if (this.protocol === "http") {
      throw new Error("暂不支持xbosh");
    } else if (this.protocol === "xmpp" && typeof process !== "undefined") {
      log.info("使用xmpp协议");
      const XMPPConnection = (await import("./transport/tcp")).default;
      return new XMPPConnection(this.jid, this.password);
    } else {
      throw new Error("未知的协议");
    }
  }

  /**
   * 监听socket事件
   * @private 仅供内部使用
   */
  _setupSocketEvents() {
    if (!this.socket) return;
    this.socket.once("connect", () => {
      log.info("连接已建立");
      this.emit("connect");
    });
    this.socket.once("binded", () => {
      this.emit("session:start");
    });
    this.socket.once("session:end", () => {
      log.info("会话结束");
      this.emit("session:end");
    });
    const msgHandler = (message: string) => this.onMessage(message);
    this.socket.on("net:message", msgHandler);
    this.socket.once("disconnect", () => {
      log.info("连接已关闭");
      this.socket?.off("net:message", msgHandler);
      this.emit("disconnect");
      // this.socket = null;
    });
  }

  disconnect() {
    // 清除所有监听器
    this.removeAllListeners();
    this.socket?.disconnect();
    // 清除所有插件
    this.pendingPlugins.clear();
    // 清除所有事件插件
    for (const [_, plugins] of Object.entries(this.eventPlugins)) {
      plugins.length = 0;
    }
    // 清除所有stanza插件
    this.stanzaPlugins.clear();
  }

  private onMessage(message: string) {
    log.debug("receive", message);

    // const xml = this.concatenateToXml(message);
    const xml = message;
    if (!xml) return;
    let stanza: Element;
    try {
      stanza = domParser.parseFromString(xml, "text/xml").documentElement!;
      if (stanza.getElementsByTagName("parsererror").length > 0) {
        throw new Error("这不是一个该有的xml！");
      }
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("unclosed xml tag") ||
          e.message.includes("missing root element") ||
          e.message.includes("Unexpected content outside root element"))
      ) {
        this.concatenateToXml(xml);
      } else {
        log.error("解析失败", e, xml);
      }
      return;
    }
    // 拦截器
    for (const handler of this.interceptors.get("receive")!) {
      stanza = handler(stanza);
    }
    // this.emit("stanza", stanza);

    const tagName = ["message", "iq", "presence"].includes(stanza.tagName)
      ? (stanza.tagName as keyof StanzaHandlerMap)
      : "others";
    const stanzaInstance = this.stanzaInstanceFactory(stanza);
    // 发出节事件
    this.emit(tagName, stanzaInstance);
  }

  /**
   * 拼接xml片段
   * @param xml xml片段
   * @returns 如果是一个完整的xml片段，返回完整xml，否则返回undefined
   */
  private concatenateToXml(xml: string) {
    // 第一个xml片段肯定以<或?开头，否则就是一个错误的xml
    if (
      this.xmlBuffer.length === 0 &&
      (!xml.startsWith("<") && !xml.startsWith("?"))
    )
      throw new Error(`未知的xml片段：${xml}`);

    this.xmlBuffer += xml;

    // 更简单的正则表达式，只匹配标签的开始和结束
    const tagRegex = /<([^>]+)>/g; // 匹配 <...> 结构
    const stack: string[] = [];
    let match;

    while ((match = tagRegex.exec(this.xmlBuffer)) !== null) {
      const tagContent = match[1]; // 提取 < 和 > 之间的内容 (不包括 <>)
      // const fullTag = match[0]; // 完整的标签字符串，包括 <>

      // XML 声明/处理指令检查
      if (tagContent.startsWith("?")) {
        continue; // 忽略 XML 声明 <?xml ... ?>
      }
      // 注释检查
      if (tagContent.startsWith("!--")) {
        if (tagContent.endsWith("--")) {
          continue; // 忽略完整注释 <!-- ... -->
        } else {
          // 不完整注释，等待后续数据
          break;
        }
      }
      // CDATA 检查
      if (tagContent.startsWith("![CDATA[")) {
        if (tagContent.endsWith("]]")) {
          continue; // 忽略完整 CDATA <![CDATA[ ... ]]>
        } else {
          // 不完整 CDATA，等待后续数据
          break;
        }
      }
      // 自闭合标签检查
      if (tagContent.endsWith("/")) {
        continue; // 忽略自闭合标签 <tag/> 或 <tag .../>
      }

      // 结束标签检查
      if (tagContent.startsWith("/")) {
        const tagName = tagContent.substring(1).trim(); // 提取结束标签名
        if (stack.length > 0 && stack[stack.length - 1] === tagName) {
          stack.pop(); // 栈顶标签匹配，出栈
        } else {
          log.warn(
            `XML标签不匹配: 结束标签 '${tagName}' 找不到匹配的开始标签`,
            this.xmlBuffer
          );
          this.xmlBuffer = "";
          return;
        }
      }
      // 开始标签检查
      else {
        const tagName = tagContent.trim().split(" ")[0]; // 提取开始标签名 (忽略属性)
        stack.push(tagName); // 开始标签入栈
      }
    }

    if (stack.length === 0 && this.xmlBuffer.trim().length > 0) {
      const result = this.xmlBuffer.trim();
      this.xmlBuffer = "";
      // 返回完整的 XML 片段
      this.onMessage(result);
      return result;
    }

    // 防止缓冲区过大
    if (this.xmlBuffer.length > 1024_000) {
      log.warn("xml片段过大，可能是一个错误的xml，清空缓冲区");
      this.xmlBuffer = "";
    }

    return;
  }

  private stanzaInstanceFactory(stanza: Element) {
    const tagName = ["message", "iq", "presence"].includes(stanza.tagName)
      ? (stanza.tagName as keyof StanzaHandlerMap)
      : "others";

    let stanzaInstance;

    if (tagName === "message") {
      stanzaInstance = new Message(stanza, this);
      this.traverseAndTransform(stanzaInstance);
      for (const eventPlugin of this.eventPlugins[tagName]) {
        if (eventPlugin.matcher(stanzaInstance)) {
          this.emit(eventPlugin.eventName, stanzaInstance);
        }
      }
      // 407行已经发出过了
      // this.emit("message", stanzaInstance);
    } else if (tagName === "iq") {
      stanzaInstance = new Iq(stanza, this);
      this.traverseAndTransform(stanzaInstance);
      for (const eventPlugin of this.eventPlugins[tagName]) {
        if (eventPlugin.matcher(stanzaInstance)) {
          this.emit(eventPlugin.eventName, stanzaInstance);
        }
      }
      // this.emit("iq", stanzaInstance);
    } else if (tagName === "presence") {
      stanzaInstance = new Presence(stanza, this);
      this.traverseAndTransform(stanzaInstance);
      for (const eventPlugin of this.eventPlugins[tagName]) {
        if (eventPlugin.matcher(stanzaInstance)) {
          this.emit(eventPlugin.eventName, stanzaInstance);
        }
      }
      // this.emit("presence", stanzaInstance);
    } else {
      stanzaInstance = new StanzaBase(stanza, this);
      this.traverseAndTransform(stanzaInstance);
      for (const eventPlugin of this.eventPlugins[tagName]) {
        if (eventPlugin.matcher(stanzaInstance)) {
          this.emit(eventPlugin.eventName, stanzaInstance);
        }
      }
      // this.emit("others", stanzaInstance);
    }

    return stanzaInstance;
  }

  /**
   * 把stanza中的所有子节点传递给插件处理成对象
   * 会直接修改原对象
   * @param obj stanza对象
   * @returns 返回obj
   */
  private traverseAndTransform(
    obj: Record<string, unknown>,
    visited = new Set()
  ) {
    if (!obj || typeof obj !== "object" || visited.has(obj)) {
      return obj;
    }
    visited.add(obj);

    if (typeof Element === "undefined") {
      globalThis.Element = E;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (
        value instanceof Element &&
        this.stanzaPlugins.has(value.namespaceURI ?? "")
      ) {
        const handler = this.stanzaPlugins.get(value.namespaceURI!)!;
        const transformed = handler(value);
        this.traverseAndTransform(transformed, visited);
        // 重新赋值
        delete obj[key];
        Object.assign(obj, transformed);
      } else if (value && Object.getPrototypeOf(obj) === Object.prototype) {
        this.traverseAndTransform(value as Record<string, unknown>, visited);
      }
    }
    return obj;
  }

  /**
   * 发送一个stanza
   * @param stanza 如果是字符串，直接发送，你要知道自己在干什么
   */
  send(stanza: Element | string) {
    if (typeof stanza === "string") {
      stanza = domParser.parseFromString(stanza, "text/xml").documentElement!;
      for (const handler of this.interceptors.get("send")!) {
        stanza = handler(stanza);
      }
      this.socket?.send(stanza);
      return;
    }
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

    for (const handler of this.interceptors.get("send")!) {
      stanza = handler(stanza);
    }
    this.socket?.send(stanza);
  }

  /**
   * 发送一个stanza，返回一个Promise对象
   * @param stanza 要发送的stanza
   * @param timeout 超时时间，默认30秒
   * @returns 一个Promise对象，仅在发送失败时reject
   * @throws 超时时抛出 TimeoutError
   */
  sendAsync(stanza: Element, timeout = 30000) {
    // 检查必须的流属性
    // XXX: 我不清楚需要进行那些检查,多余, 或者缺失

    // 一个拥有特定接收者的节必须拥有一个'to'属性
    // 一个从客户端发送到服务器的由该服务器直接处理的节(例如, presence状态信息)不能拥有'to'属性
    // if (stanza.tagName === "message" && !stanza.getAttribute("to")) {
    //   throw new Error("message stanza缺少to属性");
    // }
    // if (stanza.tagName === "iq" && !stanza.getAttribute("type")) {
    //   throw new Error("iq stanza缺少type属性");
    // }
    // 如果没有, 服务器会自动填充
    // if (!stanza.getAttribute("from")) {
    //   stanza.setAttribute("from", this.jid.full);
    // }
    if (!stanza.getAttribute("id")) {
      stanza.setAttribute("id", uuidv4());
    }
    // if (!stanza.namespaceURI) {
    //   stanza.setAttribute("xmlns", "jabber:client");
    // }
    // 一个节应该拥有'xml:lang'属性，如果这个节包含了XML字符串数据打算展示给用户
    // if (stanza.tagName === "message" && !stanza.getAttribute("xml:lang")) {
    //   stanza.setAttribute("xml:lang", "en");
    // }
    if (!this.socket) throw new Error("未连接");
    const id = stanza.getAttribute("id")!;
    const tagName = (
      ["message", "iq", "presence"].includes(stanza.tagName)
        ? stanza.tagName
        : "others"
    ) as "message" | "iq" | "presence" | "others";
    return new Promise<Element>((resolve, reject) => {
      const handler = (response: StanzaBase) => {
        if (response.id === id) {
          this.off(tagName, handler);
          clearTimeout(timer);
          resolve(response.xml);
        }
      };
      this.on(tagName, handler);
      this.send(stanza);
      const timer = setTimeout(() => {
        this.off(tagName, handler);
        reject(new TimeoutError("发送stanza超时"));
      }, timeout);
    });
    // return this.socket.sendAsync(stanza, timeout);
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
import type { PluginConstructor } from "./plugins/types";

type PluginRegistry = {
  [K in keyof typeof plugins]?: InstanceType<(typeof plugins)[K]>;
};

export default Connection;
