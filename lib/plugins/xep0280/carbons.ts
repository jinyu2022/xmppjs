import type { Connection } from "../../connection";
import { implementation, xmlSerializer } from "../../shims";
import { XMPPError } from "../../errors";
export class Carbons {
  static readonly NS = "urn:xmpp:carbons:2";
  connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  createEnableIq() {
    const iq = this.connection.createIq("set");
    iq.appendChild(
      implementation.createDocument(Carbons.NS, "enable", null).documentElement!
    );
    return iq;
  }

  enable() {
    const iq = this.connection.createIq("set");
    iq.appendChild(
      implementation.createDocument(Carbons.NS, "enable", null).documentElement!
    );
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        console.log("enable 启动成功");
      } else if (result.getAttribute("type") === "error") {
        console.log("enable failed");
      } else {
        console.error("enable failed");
      }
    });
  }

  disable() {
    const iq = this.connection.createIq("set");
    iq.appendChild(
      implementation.createDocument(Carbons.NS, "disable", null)
        .documentElement!
    );
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        console.log("disable success");
      } else if (result.getAttribute("type") === "error") {
        console.log("disable failed");
      } else {
        console.error("disable failed");
      }
    });
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
