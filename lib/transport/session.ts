import { Connection } from "@/connection";
import { Element } from "@/types";
import { log } from "@/log";

/**
 * 核心会话管理类
 * 负责处理 XMPP 核心登录流程：
 * 1. SASL 认证
 * 2. 资源绑定
 * 3. 会话建立 (如果需要)
 */
export class CoreSession {
  /** 连接实例 */
  readonly connection: Connection;

  /**
   * 构造函数
   * @param connection 连接实例
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * 启动会话管理
   * 监听连接事件和节事件，驱动登录流程。
   */
  start() {
    // 监听连接建立事件，开始流协商
    this.connection.on("connect", this.onConnect.bind(this));
    // 监听所有接收到的节，处理流特性
    this.connection.on("stanza", this.onStanza.bind(this));
  }

  /**
   * 处理连接建立事件
   */
  private onConnect() {
    log.info("连接已建立，等待服务器发送流特性...");
    // 在这里发送初始的 <stream:stream> 标签，通常由底层的 socket/transport 处理
    // 接下来等待服务器发送 <stream:features>
  }

  /**
   * 处理接收到的节
   * @param stanza 接收到的 XML 节
   */
  private onStanza(stanza: Element) {
    // 检查是否是流特性节
    if (stanza.tagName === "stream:features") {
      this.handleStreamFeatures(stanza);
    }
    // 其他核心流管理逻辑...
  }

  /**
   * 处理流特性
   * @param features 服务器发送的流特性节
   */
  private handleStreamFeatures(features: Element) {
    // 1. 检查 SASL 认证特性
    if (features.getChild("mechanisms", "urn:ietf:params:xml:ns:xmpp-sasl")) {
      this.performSASLAuth(features);
      return;
    }

    // 2. 检查资源绑定特性
    if (features.getChild("bind", "urn:ietf:params:xml:ns:xmpp-bind")) {
      this.performResourceBinding();
      return;
    }

    // 3. 检查会话建立特性 (XEP-0357: Session Establishment)
    if (features.getChild("session", "urn:ietf:params:xml:ns:xmpp-session")) {
      this.establishSession();
      return;
    }

    // 如果没有更多特性需要处理，并且已经认证/绑定，则认为会话已启动
    if (this.connection.jid.resource) {
      log.info("流特性协商完成，会话已启动");
      this.connection.emit("session:start");
    } else {
      log.error("无法完成登录流程：缺少 SASL 或资源绑定特性");
      this.connection.disconnect();
    }
  }

  /**
   * 执行 SASL 认证
   * @param features 流特性节
   */
  private performSASLAuth(features: Element) {
    log.info("开始 SASL 认证...");
    // TODO: 在这里实现 SASL 认证逻辑
    // 认证成功后，需要重新启动流，等待新的 stream:features
  }

  /**
   * 执行资源绑定
   */
  private performResourceBinding() {
    log.info("开始资源绑定...");
    // TODO: 在这里实现资源绑定逻辑
    // 绑定成功后，服务器会返回完整的 JID (包括资源)
  }

  /**
   * 建立会话
   */
  private establishSession() {
    log.info("开始会话建立...");
    // TODO: 在这里实现会话建立逻辑
  }
}

export default CoreSession;
