import XEP0030 from "./xep0030";
import XEP0156 from "./xep0156";
import XEP0280 from "./xep0280";
export { XEP0156, XEP0030, XEP0280 };

export const plugins = {
  XEP0030,
  XEP0156,
  XEP0280,
} as const;
