import type { Connection } from "./connection";
import { xmlSerializer, implementation } from "./shims";
import type { JID } from "./JID";
import logger from "./log";

const log = logger.getLogger("stanza");
type presShow = "away" | "chat" | "dnd" | "xa";
export class StanzaBase {
  static readonly NS = "jabber:client" as const;

  private readonly connection: Connection;
  /** TIP: 可以直接访问，但无法枚举 */
  readonly xml: Element;
  /** 标签名，message、persence、iq */
  readonly tagName: string;
  // readonly xmlString: string;
  readonly id: string | null;
  readonly to: string | null;
  readonly from: string | null;
  [key: string]: unknown;
  // readonly [key: string]: unknown;
  constructor(stanza: Element, connection: Connection) {
    this.xml = stanza;
    Object.defineProperty(this, "xml", {
      value: stanza,
      writable: false, // 属性不可修改
      enumerable: false, // 属性不可枚举
      configurable: true, // 属性可删除或重新定义
    });
    this.tagName = stanza.tagName;

    this.id = stanza.getAttribute("id");
    this.to = stanza.getAttribute("to");
    this.from = stanza.getAttribute("from");

    this.connection = connection;
  }

  static parseBaseStanza(stanza: Element) {
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

  send(xml: Element) {
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

  toString() {
    return xmlSerializer.serializeToString(this.xml);
  }
}

export class Iq extends StanzaBase {
  readonly type: string;
  readonly tagName = "iq";
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    const iqType = this.xml.getAttribute("type");
    // iq节点必须有type属性
    if (!iqType) throw new Error("iq节点必须有type属性");
    this.type = iqType;
  }

  static parseIq(iq: Element) {
    const id = iq.getAttribute("id");
    const to = iq.getAttribute("to");
    const from = iq.getAttribute("from");
    const type = iq.getAttribute("type");
    const childrens = Array.from(iq.childNodes).filter(
      (child) => child.nodeType === 1
    );
    const children = childrens.reduce((acc, child) => {
      acc[(child as Element).tagName] = child as Element;
      return acc;
    }, {} as Record<string, Element>);
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
    const iq = implementation.createDocument("jabber:client", "iq", null);
    iq.documentElement!.setAttribute("type", type);
    if (to) iq.documentElement!.setAttribute("to", to.toString());
    if (queryNS) {
      const query = iq.createElementNS(queryNS, "query");
      iq.documentElement!.appendChild(query);
    }
    return iq;
  }
}

export class Message extends StanzaBase {
  readonly type: string;
  readonly tagName = "message";
  readonly subject?: string | null;
  readonly body?: string | null;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    const { to, from, type, subject, body, ...children } =
      Message.parseMessage(stanza).message;
    this.type = type;
    this.subject = subject;
    this.body = body;
    for (const [key, value] of Object.entries(children)) {
      this[key] = value;
    }
  }

  static parseMessage(message: Element): Record<
    "message",
    {
      to: string | null;
      from: string | null;
      type: string;
      subject: string | null;
      body: string | null;
      [key: string]: Element | string | null;
    }
  > {
    // const id = message.getAttribute("id");
    const to = message.getAttribute("to");
    const from = message.getAttribute("from");
    const type = message.getAttribute("type") ?? "normal";
    log.debug("type", message.getAttribute("type"));
    // 查找直接子节点subject
    const subjectEl = Array.from(message.childNodes).filter(
      (child) =>
        child.nodeType === 1 && (child as Element).tagName === "subject"
    )[0];
    // 查找直接子节点body
    const bodyEl = Array.from(message.childNodes).filter(
      (child) => child.nodeType === 1 && (child as Element).tagName === "body"
    )[0];
    // 获取其余子节点
    const childrens = Array.from(message.childNodes).filter(
      (child) =>
        child.nodeType === 1 &&
        !["subject", "body"].includes((child as Element).tagName)
    );

    // 转为object，键为tagName，值为Element
    const children = childrens.reduce((acc, child) => {
      acc[(child as Element).tagName] = child as Element;
      return acc;
    }, {} as Record<string, Element>);
    return {
      message: {
        to,
        from,
        type,
        subject: subjectEl?.textContent,
        body: bodyEl?.textContent,
        ...children,
      },
    };
  }
}

export class Presence extends StanzaBase {
  readonly type: string | null;
  readonly tagName = "presence";
  readonly show?: presShow;
  readonly status?: string | null;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    this.type = stanza.getAttribute("type");
    this.show = stanza.getElementsByTagName("show")[0]?.textContent as presShow;
    this.status = stanza.getElementsByTagName("status")[0]?.textContent;
  }

  static parsePresence(presence: Element) {
    const to = presence.getAttribute("to");
    const from = presence.getAttribute("from");
    const type = presence.getAttribute("type");
    const show = presence.getElementsByTagName("show")[0]
      ?.textContent as presShow;
    const status = presence.getElementsByTagName("status")[0]?.textContent;
    const childrens = Array.from(presence.childNodes).filter(
      (child) => child.nodeType === 1
    );
    const children = childrens.reduce((acc, child) => {
      acc[(child as Element).tagName] = child as Element;
      return acc;
    }, {} as Record<string, Element>);
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
}
