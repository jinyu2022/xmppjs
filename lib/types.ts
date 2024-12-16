import type xmldom from '@xmldom/xmldom';

export interface Options {
  protocol?: Protocol;
  address?: string;
  port?: string;
  path?: string;
  tls?: boolean;
}
export type Protocol = "ws" | "http" | "xmpp";

declare global {
  type Element = xmldom.Element;
}
