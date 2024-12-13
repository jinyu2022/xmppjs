import type { Connection } from "./connection";
import { xmlSerializer } from "./shims";

export class StanzaBase {
  readonly connection: Connection;
  readonly xml: Element;
  /** 标签名，message、persence、iq */
  readonly tagName: string;
  // readonly xmlString: string;
  readonly to: string | null;
  readonly from: string | null;
  constructor(stanza: Element, connection: Connection) {
    this.xml = stanza;
    this.tagName = stanza.tagName;
    this.to = stanza.getAttribute("to");
    this.from = stanza.getAttribute("from");

    this.connection = connection;
  }

  send(xml: Element) {
    this.connection.send(xml);
  }

  toString() {
    return xmlSerializer.serializeToString(this.xml);
  }
}

export class Iq extends StanzaBase {
  readonly type: string;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    const iqType = this.xml.getAttribute("type");
    // iq节点必须有type属性
    if (!iqType) throw new Error("iq节点必须有type属性");
    this.type = iqType;
  }
}

export class Message extends StanzaBase {
  readonly type: string;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    this.type = stanza.getAttribute("type") ?? "normal";
  }
}

export class Presence extends StanzaBase {
  readonly type: string | null;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    this.type = stanza.getAttribute("type");
  }
}
