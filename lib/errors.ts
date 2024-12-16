import { xmlSerializer } from "./shims";
export const ErrorConditions = [
  "bad-request",
  "conflict",
  "feature-not-implemented",
  "forbidden",
  "gone",
  "internal-server-error",
  "item-not-found",
  "jid-malformed",
  "not-acceptable",
  "not-allowed",
  "not-authorized",
  "payment-required",
  "recipient-unavailable",
  "redirect",
  "registration-required",
  "remote-server-not-found",
  "remote-server-timeout",
  "resource-constraint",
  "service-unavailable",
  "subscription-required",
  "undefined-condition",
  "unexpected-request",
] as const;

export type ErrorTypes = "modify" | "cancel" | "auth" | "wait";

export class XMPPError extends Error {
  readonly NS = "urn:ietf:params:xml:ns:xmpp-stanzas";
  readonly condition: (typeof ErrorConditions)[number] | null = null;
  readonly type: ErrorTypes | null = null;
  readonly text: string | null = null;

  readonly xmlElement: Element;
  /** 标签名，message、persence、iq */
  readonly tagName: string;
  readonly xmlString: string;
  readonly to: string | null;
  readonly from: string | null;

  constructor(stanza: Element, message: string) {
    super(message);
    this.xmlElement = stanza;
    this.tagName = stanza.tagName;
    this.to = stanza.getAttribute("to");
    this.from = stanza.getAttribute("from");
    this.xmlString = xmlSerializer.serializeToString(stanza);

    const error = stanza.getElementsByTagName("error")[0];
    if (!error) return;

    const condition = error.getElementsByTagNameNS(this.NS, "*")[0]?.tagName;
    if (!condition) {
      throw new Error("没有condition节点");
    } else if (
      ErrorConditions.includes(condition as (typeof ErrorConditions)[number])
    ) {
      this.condition = condition as (typeof ErrorConditions)[number];
    } else {
      throw new Error("未知的condition");
    }

    const type = error.getAttribute("type");
    this.type = type as ErrorTypes;

    this.text = error.getElementsByTagName("text")[0]?.textContent;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
