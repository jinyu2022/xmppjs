import type { Connection } from "./connection";
import { XMPPElement } from "./ltx/Element";
import { JID } from "./JID";
import logger from "./log";

const log = logger.getLogger("stanza");
/**away：离开 chat：在线 dnd：忙碌 xa：离开（长时间）*/
type presShow = "away" | "chat" | "dnd" | "xa";
/**normal：普通消息（默认值） chat：聊天消息 groupchat：群聊消息 error：错误消息 */
export type MsgType = "normal" | "chat" | "groupchat" | "error";
export class StanzaBase {
  static readonly NS = "jabber:client" as const;

  /** TIP: 可以直接访问，但无法枚举 */
  private readonly connection: Connection;
  /** TIP: 可以直接访问，但无法枚举 */
  readonly xml: XMPPElement;
  /** 标签名，message、persence、iq */
  readonly tagName: string;
  // readonly xmlString: string;
  readonly id: string | null;
  readonly to?: JID | string;
  readonly from?: JID | string;
  [key: string]: unknown;
  constructor(stanza: XMPPElement, connection: Connection) {
    this.xml = stanza;
    Object.defineProperty(this, "xml", {
      value: stanza,
      writable: false, // 属性不可修改
      enumerable: false, // 属性不可枚举
      configurable: true, // 属性可删除或重新定义
    });
    this.tagName = stanza.tagName;
    this.id = stanza.getAttribute("id");
    this.to = stanza.getAttribute("to") ?? void 0;
    this.from = stanza.getAttribute("from") ?? void 0;
    if (this.to?.includes("@")) this.to = new JID(this.to);
    if (this.from?.includes("@")) this.from = new JID(this.from);
    this.connection = connection;
    Object.defineProperty(this, "connection", {
      value: connection,
      writable: false, // 属性不可修改
      enumerable: false, // 属性不可枚举
      configurable: true, // 属性可删除或重新定义
    });
  }

  static parseBaseStanza(stanza: XMPPElement) {
    if (stanza.tagName === "iq") {
      return Iq.parseIq(stanza);
    } else if (stanza.tagName === "message") {
      return Message.parseMessage(stanza);
    } else if (stanza.tagName === "presence") {
      return Presence.parsePresence(stanza);
    } else {
      throw new Error("未知的stanza");
    }
  }

  send(xml: XMPPElement) {
    this.connection.send(xml);
  }

  /**
   * 添加一个只读属性
   * @param name 属性名
   * @param value 属性值
   */
  addProperty(name: keyof this, value: string | object | Set<unknown>) {
    Object.defineProperty(this, name, {
      value: value,
      writable: false, // 属性不可修改
      enumerable: true, // 属性可枚举
      configurable: true, // 属性可删除或重新定义
    });
  }

  /**
   * @returns xml字符串
   */
  toString() {
    return this.xml.toXMLString();
  }
}

export class Iq extends StanzaBase {
  readonly type: "get" | "set" | "result" | "error";
  readonly tagName = "iq";
  constructor(stanza: XMPPElement, connection: Connection) {
    super(stanza, connection);
    const { id, to, from, type, ...children } = Iq.parseIq(stanza).iq;
    // iq节点必须有type属性
    if (!type) throw new Error("iq节点必须有type属性");
    this.type = type;
    // 将其余子节点添加到实例上
    for (const [key, value] of Object.entries(children)) {
      this[key] = value;
    }
  }

  static parseIq(iq: XMPPElement) {
    const id = iq.getAttribute("id");
    let to: JID | string | null = iq.getAttribute("to");
    let from: JID | string | null = iq.getAttribute("from");
    if (to?.includes("@")) to = new JID(to);
    if (from?.includes("@")) from = new JID(from);
    const type = iq.getAttribute("type") as 'get' | 'set' | 'result' | 'error';;
    const children = Array.from(iq.children).reduce((acc, child) => {
      acc[child.tagName] = child;
      return acc;
    }, {} as Record<string, XMPPElement>);
    return {
      iq: {
        id,
        to,
        from,
        type,
        ...children,
      },
    };
  }

  static createIq(
    type: "get" | "set" | "result" | "error",
    to?: JID | string,
    queryNS?: string
  ) {
    const iq = XMPPElement.createElementNS("jabber:client", "iq");
    iq.setAttribute("type", type);
    if (to) iq.setAttribute("to", to.toString());
    if (queryNS) {
      const query = XMPPElement.createElementNS(queryNS, "query");
      iq.appendChild(query);
    }
    return iq;
  }
}

export class Message extends StanzaBase {
  readonly type: 'normal' | 'chat' | 'groupchat' | 'error' | null;
  readonly tagName = "message";
  readonly subject?: string | null;
  readonly body?: string | null;
  constructor(stanza: XMPPElement, connection: Connection) {
    super(stanza, connection);
    const { to, from, type, subject, body, ...children } =
      Message.parseMessage(stanza).message;
    this.type = type;
    this.subject = subject;
    this.body = body;
    // 将其余子节点添加到实例上
    for (const [key, value] of Object.entries(children)) {
      this[key] = value;
    }
  }

  static parseMessage(message: XMPPElement): Record<
    "message",
    {
      to: JID | string | null;
      from: JID | string | null;
      type: "normal" | "chat" | "groupchat" | "error";
      subject: string | null;
      body: string | null;
      [key: string]: Element | string | JID | null;
    }
  > {
    // const id = message.getAttribute("id");
    let to: JID | string | null = message.getAttribute("to");
    let from: JID | string | null = message.getAttribute("from");
    if (to?.includes("@")) to = new JID(to);
    if (from?.includes("@")) from = new JID(from);
    const type = (message.getAttribute("type") ?? "normal") as MsgType;
    // 查找直接子节点subject
    // 某些XEP的子元素也会有subject标签，但是主题subject应该是message的直接子节点
    const subjectEl = Array.from(message.children).find(
      (child) => child.tagName === "subject"
    );
    // 查找直接子节点body，理由同上
    const bodyEl = Array.from(message.children).find(
      (child) => child.tagName === "body"
    );
    // 获取其余子节点
    const childrens = Array.from(message.children).filter(
      (child) =>
        child.tagName !== "subject" && child.tagName !== "body"
    );

    // 转为object，键为tagName，值为Element
    // 应该不会有重复的tagName吧？
    const children = childrens.reduce((acc, child) => {
      acc[child.tagName] = child;
      return acc;
    }, {} as Record<string, XMPPElement>);
    return {
      message: {
        to,
        from,
        type,
        subject: subjectEl?.textContent ?? null, // 如果没有subject节点则为null
        body: bodyEl?.textContent ?? null,       // sub和body类型早已定义为string | null
        ...children,
      },
    };
  }

  /**
   * 创建一个消息stanza
   * @param to 接收者JID或字符串
   * @param body 消息体
   * @param type 消息类型，默认为normal
   * @returns XMPPElement 消息stanza
   */
  static createMessage(to: JID | string, body?: string, type: MsgType = "normal") {
    const message = XMPPElement.createElementNS(StanzaBase.NS, "message");
    message.setAttribute("to", to.toString());
    message.setAttribute("type", type);
    /** 消息体元素 */
    if (body) {
      const bodyEl = XMPPElement.createElement("body");
      bodyEl.textContent = body;
      message.appendChild(bodyEl);
    }
    return message;
  }
}

export class Presence extends StanzaBase {
  readonly type: string | null;
  readonly tagName = "presence";
  readonly show?: presShow;
  readonly status?: string | null;
  constructor(stanza: XMPPElement, connection: Connection) {
    super(stanza, connection);
    const { to, from, type, show, status, ...children } =
      Presence.parsePresence(stanza).presence;
    this.type = type;
    this.show = show;
    this.status = status;
    // 将其余子节点添加到实例上
    for (const [key, value] of Object.entries(children)) {
      this[key] = value;
    }
  }

  static parsePresence(presence: XMPPElement) {
    // const presence
    let to: JID | string | null = presence.getAttribute("to");
    let from: JID | string | null = presence.getAttribute("from");
    if (to?.includes("@")) to = new JID(to);
    if (from?.includes("@")) from = new JID(from);
    const type = presence.getAttribute("type");
    const show = presence.getElementsByTagName("show")[0]
      ?.textContent as presShow;
    const status = presence.getElementsByTagName("status")[0]?.textContent;
    const childrens = Array.from(presence.children).filter(
      (child) =>
        child.tagName !== "show" &&
        child.tagName !== "status"
    );
    const children: Record<string, XMPPElement> = {};
    for (const child of childrens) {
      children[child.tagName] = child;
    }
    return {
      presence: {
        to,
        from,
        type,
        show,
        status,
        ...children,
      },
    };
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
  static createPresence(
    to: JID | string,
    type?: "subscribe" | "unsubscribe" | "unavailable" | "subscribed" | "unsubscribed",
  ) {
    const presence = XMPPElement.createElementNS(StanzaBase.NS, "presence");
    presence.setAttribute("to", to.toString());
    if (type) presence.setAttribute("type", type);
    return presence;
  }
}
