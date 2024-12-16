import XEP0004 from "./xep0004";
import XEP0030 from "./xep0030";
import XEP0156 from "./xep0156";
import XEP0203 from "./xep0203";
import XEP0280 from "./xep0280";
import XEP0297 from "./XEP0297";
export { XEP0004,XEP0156, XEP0030,XEP0203, XEP0280, XEP0297 };

export const plugins = {
  XEP0004,
  XEP0030,
  XEP0156,
  XEP0203,
  XEP0280,
  XEP0297,
} as const;

export const parsePluginsMap = new Map<string, (stanza: Element) => object>([
  [XEP0004.NS, XEP0004.parseFormEl],
  [XEP0203.NS, XEP0203.parseDelayEl],
  [XEP0280.NS, XEP0280.parseCarbonEl],
  [XEP0297.NS, XEP0297.parseForwarded],
])
  

