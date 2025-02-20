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
  // eslint-disable-next-line no-var
  var Element: typeof xmldom.Element;
}
