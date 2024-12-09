import type { Connection } from "../../connection";
import { implementation } from "../../shims";
export class Carbons {
  readonly NS = "urn:xmpp:carbons:2";
  connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  createEnableIq() {
    const iq = this.connection.createIq("set");
    iq.appendChild(implementation.createDocument(this.NS, "enable", null).documentElement);
    return iq;
  }

  enable() {
    const iq = this.connection.createIq("set");
    iq.appendChild(implementation.createDocument(this.NS, "enable", null).documentElement);
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        console.log("enable 启动成功");
      }else if (result.getAttribute("type") === "error") {
        console.log("enable failed");
      }else {
        console.error("enable failed");
      }
    });
  }

  disable() {
    const iq = this.connection.createIq("set");
    iq.appendChild(implementation.createDocument(this.NS, "disable", null).documentElement);
    this.connection.sendAsync(iq).then((result) => {
      if (result.getAttribute("type") === "result") {
        console.log("disable success");
      }else if (result.getAttribute("type") === "error") {
        console.log("disable failed");
      }else {
        console.error("disable failed");
      }
    });
  }
}
