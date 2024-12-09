import type { Connection } from "./connection";
import { xmlSerializer } from "./shims";
export class StanzaBase {
  readonly connection: Connection;
  readonly xmlElement: Element;
  /** 标签名，message、persence、iq */
  readonly name: string;
  readonly xmlString: string;
  readonly to: string | null
  readonly from: string | null
  constructor(stanza: Element, connection: Connection) {
    this.xmlElement = stanza;
    this.name = stanza.tagName;
    this.to = stanza.getAttribute("to");
    this.from = stanza.getAttribute("from");
    this.xmlString = xmlSerializer.serializeToString(stanza);

    this.connection = connection;
  }

  send() {
    this.connection.send(this.xmlElement);
  }
  toString() {
    return this.xmlString;
  }
}

export class Iq extends StanzaBase {
  readonly type: string;
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
    const iqType = this.xmlElement.getAttribute("type");
    // iq节点必须有type属性
    if (!iqType) throw new Error("iq节点必须有type属性");
    this.type = iqType;
  }
}

export class Message extends StanzaBase {
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
  }


}

export class Presence extends StanzaBase {
  constructor(stanza: Element, connection: Connection) {
    super(stanza, connection);
  }
}
