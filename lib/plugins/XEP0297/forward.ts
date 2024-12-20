import { XMPPError } from "../../errors";

export interface Base {
  message?: Element | null;
  presence?: Element | null;
  iq?: Element | null;
}
// 生成只包含一个键的对象类型的联合
type Forwarded = {
  delay?: Element | null;
} & {
  [K in keyof Base]: Pick<Base, K>;
}[keyof Base];

export class Forward {
  static readonly NS = "urn:xmpp:forward:0";

  static parseForwardedEl(message: Element): { forwarded: Forwarded } {
    const forwarded =
      message.tagName === "forwarded"
        ? message
        : message.getElementsByTagName("forwarded")[0];
    if (!forwarded) throw new XMPPError(message, "未找到forwarded标签");
    const delayElement = forwarded.getElementsByTagName("delay")[0];
    // let delay = null;
    // 按照规范应该只有一个"message" | "presence" | "iq"标签
    const childrens = Array.from(forwarded.childNodes).filter(
      (child) =>
        child.nodeType === 1 &&
        ["message", "presence", "iq"].includes((child as Element).tagName)
    ) as Element[];
    if (childrens.length !== 1) {
      throw new XMPPError(message, "forwarded包含多个message | presence | iq");
    }
    const childrenTag = childrens[0].tagName as keyof Base;
    return {
      forwarded: {
        delay: delayElement,
        [childrenTag]: childrens[0],
      },
    };
  }
}
