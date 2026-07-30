import { XMPPElement } from "./ltx/Element";
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

/**
 * 专门用于表达 XMPP 错误的类，继承自 Error
 */
export class XMPPError extends Error {
  static readonly NS = "urn:ietf:params:xml:ns:xmpp-stanzas";
  readonly condition: (typeof ErrorConditions)[number] | null = null;
  readonly type: ErrorTypes | null = null;
  text: string | null = null;

  // readonly xmlElement: Element;
  /** 标签名，message、persence、iq */
  readonly tagName: string;
  readonly xmlString: string;
  readonly to: string | null;
  readonly from: string | null;

  constructor(stanza: XMPPElement, message: string) {
    super(message);
    this.name = "XMPPError";
    this.tagName = stanza.tagName;
    this.to = stanza.getAttribute("to");
    this.from = stanza.getAttribute("from");
    this.xmlString = stanza.toXMLString();

    const error = stanza.getElementsByTagName("error")[0];
    if (!error) return;

    const condition = error.getElementsByTagNameNS(XMPPError.NS, "*")[0]
      ?.tagName as (typeof ErrorConditions)[number];
    // if (!condition) {
    //   throw new Error("没有condition节点");
    // } else
    if (ErrorConditions.includes(condition)) {
      this.condition = condition;
    }
    // else {
    //   throw new Error("未知的condition");
    // }

    const type = error.getAttribute("type") as ErrorTypes | null;
    this.type = type;

    this.text = error.getElementsByTagName("text")[0]?.textContent;
  }
}

/**
 * 专门用于表达超时错误的类，继承自 Error
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
