import { EventEmitter } from "events";
import { Form } from "../xep0004/form";
import { Iq } from "@/stanza"
export class Register {
  static readonly NS = "jabber:iq:register" as const;

  static async createSocket(domain: string, protocol: "xmpps" | "ws") {
    if (protocol === "xmpps") {
      const { resolveXMPPSrv } = await import("@/dns");
      const { connect } = await import("tls");
      const srv = await resolveXMPPSrv(domain, true);
      return connect({
        host: srv[0].host,
        port: srv[0].port,
        timeout: 10_000,
      });
    } else {
      const { XMPPDiscoverer } = await import("../xep0156/discoverAltXMPP");
      const { websocket } = await XMPPDiscoverer.discoverAltXMPP(domain);
      if (!websocket) {
        throw new Error("未发现websocket地址");
      }
      const connection = new WSconnection(websocket);
      await connection.connect();
      return connection;
    }
  }

  static createSubmitFormEL(username: string, password: string, captcha?: string, challenge?: string) {
    
    const fields = [
      { type: "hidden" as const, var: "FORM_TYPE", values: [Register.NS] },
      { var: "username", values: [username] },
      { var: "password", values: [password] },
  ]
    if (captcha) fields.push({ var: "ocr", values: [captcha] });
    if (challenge) fields.push({ var: "challenge", values: [challenge] });
    const form = Form.createFormEl({
      type: "submit",
      fields
    })
    const iq = Iq.createIq("set")
    const query = iq.createElementNS(Register.NS, "query")
    query.appendChild(form)
    iq.documentElement!.appendChild(query);
    iq.documentElement!.setAttribute("id", "reg2");
    console.log(iq.documentElement?.namespaceURI)
    return iq.documentElement!;
  }
}

/**
 * 兼容TLSSocket api 的包装
 */
export class WSconnection extends EventEmitter{
  private readonly url: string;
  private socket: WebSocket| null = null;
  static readonly eventMap = {
    data: "message",
    close: "close",
    connect: "open",
    error: "error",
  } as const;
  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect() {
    const WS = (await import("@/shims")).getWebSocket();
    // @ts-expect-error node的ws和浏览器的ws类型不一样
    this.socket = new WS(this.url);
    this.socket!.onopen = this.onOpen.bind(this);
    this.socket!.onmessage = this.onMessage.bind(this);
    this.socket!.onclose = this.onClose.bind(this);
    this.socket!.onerror = this.onError.bind(this);
  }

  onOpen(data: unknown) {
    this.emit("connect", data);
  }

  onMessage(data: MessageEvent) {
    this.emit("data", data.data);
  }

  onClose(data: unknown) {
    this.emit("close", data);
  }

  onError(data: unknown) {
    this.emit("error", data);
  }
  
  write(data: string) {
    this.socket!.send(data);
  }

  close() {
    this.socket!.close();
  }
}
