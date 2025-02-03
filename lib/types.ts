import type xmldom from "@xmldom/xmldom";

export interface Options {
  protocol?: Protocol;
  host?: string;
  port?: string;
  path?: string;
  tls?: boolean;
}
export type Protocol = "ws" | "http" | "xmpp";

declare global {
  type Element = xmldom.Element;
  const Element: typeof xmldom.Element;
}
