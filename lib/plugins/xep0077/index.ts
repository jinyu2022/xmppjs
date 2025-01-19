import { Form, type DataForm } from "../xep0004/form";
import { domParser, xmlSerializer } from "@/shims";
import { XMPPError, TimeoutError } from "@/errors";
import { Register, type WSconnection } from "./register";
import type { TLSSocket } from "tls";
import { EventEmitter } from "events";
/**
 * XEP-0077: In-Band Registration
 * version: 2.4 (2012-01-25)
 * @see https://xmpp.org/extensions/xep-0077.html
 *
 */
export default class XEP0077 extends Register {
  private domain?: string;
  private socket: TLSSocket | WSconnection | null = null;
  private readonly event = new EventEmitter();
  private protocol?: "xmpps" | "ws";
  private reginstionForm?: DataForm;
  constructor() {
    super();
  }
  init() {
    // 不需要
  }
  // 设置监听器
  setListener() {
    this.socket!.once("connect", () => {
      
      if (this.protocol === "xmpps") {
        console.log("connected");
        this.socket!.write(
          `<?xml version="1.0"?><stream:stream to="${this.domain}" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`
        );
      } else {
        console.log("open");
        this.socket!.write(
          `<open to="${this.domain}" version="1.0" xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>`
        );
      }
    });

    this.socket!.once("close", () => {
      console.log("close");
      // 清除全部监听器
      this.socket!.removeAllListeners();
      this.event.removeAllListeners();
      this.socket = null;
    });
    this.socket!.on("data", (data) => {
      console.log("接受", data.toString());
      this.parse(data.toString());
    });
  }

  async connectSocket(domain: string, protocol: "xmpps" | "ws") {
    this.domain = domain;
    this.protocol = protocol;
    this.socket = await Register.createSocket(domain, protocol);
    this.setListener();
  }

  sendAsync(data: string | Element, timeout = 10_000): Promise<Element> {
    let xml: Element | null;
    if (typeof data === "string") {
      xml = domParser.parseFromString(data, "text/xml").documentElement;
      if (!xml) throw new Error("无效的XML字符串");
    } else {
      xml = data;
    }

    const id = xml.getAttribute("id");
    if (!id) throw new XMPPError(xml, "缺少id属性");

    return new Promise((resolve, reject) => {
      const onResponse = (response: string) => {
        response = response.toString();
        const resElement = domParser.parseFromString(response, "text/xml")
          .documentElement!;
        const responseId = resElement.getAttribute("id");
        if (responseId === id) {
          // 收到匹配的响应，解除监听并解析 Promise
          this.socket!.off("data", onResponse);
          clearTimeout(timer);
          resolve(resElement);
        }
      };

      // 监听全局事件
      this.socket!.on("data", onResponse);

      // 处理超时
      const timer = setTimeout(() => {
        this.socket!.off("data", onResponse);
        reject(new TimeoutError(`请求超时: ${id}`));
      }, timeout);

      this.socket!.write(xmlSerializer.serializeToString(xml));
    });
  }

  parse(data: string) {
    if (data.includes("urn:ietf:params:xml:ns:xmpp-sasl")) {
      if (data.includes("http://jabber.org/features/iq-register")) {
        this.sendAsync(
          `<iq type='get' id='reg1'><query xmlns='${XEP0077.NS}'/></iq>`
        )
          .then((res) => {
            const { form } = Form.parseFormEl(
              res.getElementsByTagNameNS(Form.NS, "x")[0]
            );
            this.reginstionForm = form;
            this.event.emit("registion", form);
          })
          .catch((e) => {
            console.error(e);
            this.event.emit("registion", null);
          });
      } else {
        console.log("不支持注册");
        this.event.emit("registion", null);
      }
    }
  }

  getRegistionForm() {
    if (this.reginstionForm) {
      return Promise.resolve(this.reginstionForm);
    } else {
      return new Promise<DataForm | null>((resolve, reject) => {
        this.event.once("registion", (form) => {
          resolve(form);
        });
        this.socket!.once("close", () => {
          reject(new Error("连接已关闭"));
        });
      });
    }
  }

  /**
   * 注册账号 - Element重载
   * @param iq IQ请求Element
   */
  register(iq: Element): Promise<boolean>;

  /**
   * 注册账号 - 参数重载
   * @param username 用户名
   * @param password 密码
   * @param captcha 可选验证码
   * @param challenge 可选challenge
   */
  register(
    username: string,
    password: string,
    captcha?: string,
    challenge?: string
  ): Promise<boolean>;

  async register(
    iqOrUsername: Element | string,
    password?: string,
    captcha?: string,
    challenge?: string
  ): Promise<boolean> {
    let iq: Element;

    if (typeof iqOrUsername === "string") {
      if (!password) throw new Error("密码不能为空");
      const challengeValue = this.reginstionForm?.fields.find(
        (field) => field.var === "challenge"
      )?.values[0];
      iq = XEP0077.createSubmitFormEL(
        iqOrUsername,
        password,
        captcha,
        challengeValue ?? challenge
      );
    } else {
      iq = iqOrUsername;
    }

    console.log(xmlSerializer.serializeToString(iq));
    const res = await this.sendAsync(iq);
    if (res.getAttribute("type") === "result") {
      return true;
    } else {
      throw new XMPPError(res, "注册失败");
    }
  }
}
