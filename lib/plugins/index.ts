import RFC6121 from "./rfc6121";
import XEP0004 from "./xep0004";
import XEP0030 from "./xep0030";
import XEP0045 from "./xep0045";
import XEP0084 from "./xep0084";
import XEP0156 from "./xep0156";
import XEP0163 from "./xep0163";
import XEP0172 from "./xep0172";
import XEP0199 from "./xep0199";
import XEP0203 from "./xep0203";
import XEP0280 from "./xep0280";
import XEP0297 from "./XEP0297";
export {
  RFC6121,
  XEP0004,
  XEP0030,
  XEP0045,
  XEP0084,
  XEP0156,
  XEP0163,
  XEP0199,
  XEP0203,
  XEP0280,
  XEP0297,
};

export const plugins = {
  RFC6121,
  XEP0004,
  XEP0030,
  XEP0045,
  XEP0084,
  XEP0156,
  XEP0163,
  XEP0172,
  XEP0199,
  XEP0203,
  XEP0280,
  XEP0297,
} as const;
