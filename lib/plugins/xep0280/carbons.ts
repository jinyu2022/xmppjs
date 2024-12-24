import { implementation } from "../../shims";
import { XMPPError } from "../../errors";
import { Iq } from "@/stanza";
export class Carbons {
  static readonly NS = "urn:xmpp:carbons:2";

  static createEnableIq() {
    const iq = Iq.createIq("set").documentElement!;
    iq.appendChild(
      implementation.createDocument(Carbons.NS, "enable", null).documentElement!
    );
    return iq;
  }

  static createDisableIq() {
    const iq = Iq.createIq("set").documentElement!;
    iq.appendChild(
      implementation.createDocument(Carbons.NS, "disable", null).documentElement!
    );
    return iq;
  }


  static parseCarbonEl(carbon: Element) {
    // 判断当前节点是否为 received/sent
    const received =
      carbon.tagName === "received"
        ? carbon
        : carbon.getElementsByTagName("received")[0];
    if (received) {
      return {
        carbon: {
          type: "received",
          forwarded: received.getElementsByTagName("forwarded")[0],
        },
      };
    }

    const sent =
      carbon.tagName === "sent"
        ? carbon
        : carbon.getElementsByTagName("sent")[0];
    if (sent) {
      return {
        carbon: {
          type: "sent",
          forwarded: sent.getElementsByTagName("forwarded")[0],
        },
      };
    } else {
      throw new XMPPError(carbon, "未找到 carbon 元素");
    }
  }
}
