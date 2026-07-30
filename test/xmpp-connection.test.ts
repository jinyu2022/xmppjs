import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, createHmac, pbkdf2Sync } from "node:crypto";
import { Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { JID } from "../lib/JID";
import { Parser } from "../lib/ltx/Parser";
import { Status } from "../lib/transport/typing";

/** Mock XMPP 服务端接口，用于在测试中模拟服务端行为。 */
interface MockXmppServer {
  /** 模拟服务端接受 TCP 连接。 */
  acceptConnection(): void;
  /** 模拟服务端向客户端发送 XML 数据。 */
  send(xml: string): void;
  /**
   * 检查客户端发送的 XML 是否包含期望的内容，并返回完整 XML。
   * @param expected - 期望在客户端消息中包含的字符串片段。
   * @throws 若客户端未发送任何数据或不包含期望内容则抛出错误。
   */
  expectReceived(expected: string): string;
  /** 模拟服务端关闭连接。 */
  close(): void;
  /** 模拟 socket 错误。 */
  fail(error: Error): void;
}

/**
 * 创建 Mock Socket 工厂函数和 Mock 服务端引用。
 * 在 vi.hoisted 中提升到模块最顶层，确保 vi.mock 能直接引用。
 */
const { createMockSocket, serverRef } = await vi.hoisted(async () => {
  const { EventEmitter } = await import("node:events");
  const ref: { current: MockXmppServer | null } = { current: null };

  class MockSocket extends EventEmitter {
    readonly received: string[] = [];

    setEncoding() {}
    setTimeout() {}
    connect() {}
    end() {}

    write(xml: string): boolean {
      this.received.push(xml);
      return true;
    }
  }

  function createSocket(): MockSocket {
    const socket = new MockSocket();

    ref.current = {
      acceptConnection() {
        socket.emit("connect");
      },
      send(xml: string) {
        socket.emit("data", Buffer.from(xml));
      },
      expectReceived(expected: string) {
        const xml = socket.received.shift();
        if (xml === undefined) {
          throw new Error(`客户端没有发送 XML，期望收到：${expected}`);
        }
        if (!xml.includes(expected)) {
          throw new Error(`客户端发送的 XML 不符合预期：${xml}`);
        }
        return xml;
      },
      close() {
        socket.emit("close");
      },
      fail(error: Error) {
        socket.emit("error", error);
      },
    };

    return socket;
  }

  return { createMockSocket: createSocket, serverRef: ref };
});

// 将 net.Socket 替换为 Mock Socket，避免真实 TCP 连接
vi.mock("net", () => ({
  Socket: vi.fn().mockImplementation(() => createMockSocket()),
}));

// 将 tls.connect 替换为 Mock Socket，避免真实 TLS 连接
vi.mock("tls", () => ({
  connect: vi.fn().mockImplementation(() => createMockSocket()),
}));

import XMPPConnection from "../lib/transport/tcp";

/** 测试用的 JID（带资源标识符） */
const TEST_JID = new JID("test@example.com/resource");
/** 测试用的密码 */
const TEST_PASSWORD = "test123";
/** 测试用的服务端地址（TCP 直连模式） */
const SERVER_URL = "tcp://localhost:5222";

/** 包含 PLAIN 认证机制的 stream features，模拟服务端在流协商第一阶段返回。 */
const AUTH_FEATURES = `<stream:features xmlns:stream="http://etherx.jabber.org/streams">
  <mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
    <mechanism>PLAIN</mechanism>
  </mechanisms>
</stream:features>`;

const SCRAM_AUTH_FEATURES = `<stream:features xmlns:stream="http://etherx.jabber.org/streams">
  <mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
    <mechanism>PLAIN</mechanism>
    <mechanism>SCRAM-SHA-1</mechanism>
  </mechanisms>
</stream:features>`;

/** 包含资源绑定的 stream features，模拟服务在 SASL 认证后返回。 */
const BIND_FEATURES = `<stream:features xmlns:stream="http://etherx.jabber.org/streams">
  <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"/>
</stream:features>`;

/**
 * 获取当前测试会话的 MockXmppServer 实例。
 * @throws 若未先调用 client.connect() 则抛出错误。
 */
function getServer(): MockXmppServer {
  if (!serverRef.current) {
    throw new Error("Mock XMPP 服务端尚未创建，请先调用 client.connect()。");
  }
  return serverRef.current;
}

/**
 * 等待客户端触发指定事件，返回 Promise。
 * @param client - XMPP 连接实例。
 * @param event - 期望等待的事件名。
 * @returns 解析为事件携带的数据的 Promise。
 */
function waitForEvent<T>(
  client: XMPPConnection,
  event: "authenticated" | "binded" | "stanza" | "session:end" | "disconnect" | "error",
): Promise<T> {
  return new Promise((resolve) => client.once(event, resolve as never));
}

function createScramServerExchange(clientAuthBase64: string) {
  const clientFirstMessage = Buffer.from(clientAuthBase64, "base64").toString();
  if (!clientFirstMessage.startsWith("n,,")) {
    throw new Error(`无效的 SCRAM 首条消息：${clientFirstMessage}`);
  }

  const clientFirstBare = clientFirstMessage.slice(3);
  const clientNonce = /(?:^|,)r=([^,]+)/.exec(clientFirstBare)?.[1];
  if (!clientNonce) throw new Error("SCRAM 首条消息缺少客户端 nonce");

  const salt = Buffer.from("fixed-test-salt", "utf8");
  const serverFirst = `r=${clientNonce}fixed-server-nonce,s=${salt.toString("base64")},i=4096`;
  const clientFinalBare = `c=biws,r=${clientNonce}fixed-server-nonce`;
  const authMessage = `${clientFirstBare},${serverFirst},${clientFinalBare}`;

  const saltedPassword = pbkdf2Sync(TEST_PASSWORD, salt, 4096, 20, "sha1");
  const clientKey = createHmac("sha1", saltedPassword)
    .update("Client Key")
    .digest();
  const storedKey = createHash("sha1").update(clientKey).digest();
  const clientSignature = createHmac("sha1", storedKey)
    .update(authMessage)
    .digest();
  const clientProof = Buffer.from(
    clientKey.map((byte, index) => byte ^ clientSignature[index]),
  ).toString("base64");
  const serverKey = createHmac("sha1", saltedPassword)
    .update("Server Key")
    .digest();
  const serverSignature = createHmac("sha1", serverKey)
    .update(authMessage)
    .digest("base64");

  return {
    challenge: Buffer.from(serverFirst).toString("base64"),
    expectedResponse: Buffer.from(
      `${clientFinalBare},p=${clientProof}`,
    ).toString("base64"),
    success: Buffer.from(`v=${serverSignature}`).toString("base64"),
  };
}

/**
 * 建立 Mock TCP 连接并返回 Mock 服务端句柄。
 * @param client - XMPP 连接实例。
 * @returns 可用于模拟服务端行为的 MockXmppServer 实例。
 */
async function connectClient(client: XMPPConnection): Promise<MockXmppServer> {
  await client.connect(SERVER_URL);
  return getServer();
}

/**
 * 完成完整的 XMPP 握手流程：TCP 连接 → 流协商 → SASL 认证 → 资源绑定。
 * 握手成功后可通过返回的 server 收发自定义 XML。
 * @param client - XMPP 连接实例。
 * @param boundJid - 资源绑定成功后服务端返回的完整 JID，默认 test@example.com/server-resource。
 * @returns 握手完成后的 MockXmppServer 实例。
 */
async function completeHandshake(
  client: XMPPConnection,
  boundJid = "test@example.com/server-resource",
): Promise<MockXmppServer> {
  // ---- 第一步：TCP 连接与初始流协商 ----
  const server = await connectClient(client);

  server.acceptConnection();
  server.expectReceived("<stream:stream");

  // ---- 第二步：SASL 认证（PLAIN 机制） ----
  server.send(AUTH_FEATURES);
  server.expectReceived("<auth");

  // 等待客户端触发 authenticated 事件后再发送新流
  const authenticated = waitForEvent(client, "authenticated");
  server.send(`<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>`);
  await authenticated;
  server.expectReceived("<stream:stream");

  // ---- 第三步：资源绑定 ----
  server.send(BIND_FEATURES);
  const bindRequest = Parser.parse(server.expectReceived("<iq"));
  const bindId = bindRequest.getAttribute("id");
  if (!bindId) throw new Error("资源绑定请求缺少 id 属性");

  // 发送资源绑定成功响应，携带服务端分配的完整 JID
  const binded = waitForEvent(client, "binded");
  server.send(`<iq xmlns="jabber:client" id="${bindId}" type="result">
    <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">
      <jid>${boundJid}</jid>
    </bind>
  </iq>`);
  await binded;

  return server;
}

/**
 * XMPPConnection 传输层集成测试。
 * 使用 Mock Socket 模拟服务端，验证连接、认证、资源绑定、消息收发、
 * 错误处理及断开连接等完整生命周期。
 */
describe("XMPPConnection 传输层集成测试", () => {
  let client: XMPPConnection;

  // 每个测试前重置 Mock 状态并创建新的客户端实例（非 TLS 模式）
  beforeEach(() => {
    vi.clearAllMocks();
    serverRef.current = null;
    client = new XMPPConnection(TEST_JID, TEST_PASSWORD, false);
  });

  // 每个测试后尝试断开连接，确保不残留 socket 和事件监听器
  afterEach(() => {
    try {
      client.disconnect();
    } catch {
      // 未建立连接时无需断开
    }
  });

  /**
   * 验证完整的 XMPP 握手流程：
   * 1. 发送初始流头，携带目标域
   * 2. 收到 auth features 后发起 PLAIN 认证
   * 3. 收到 success 后重新发送流头
   * 4. 收到 bind features 后发送资源绑定 IQ
   * 5. 验证最终状态为 BINDED，JID 为服务端分配的值
   */
  it("按协议完成连接、PLAIN 认证和资源绑定", async () => {
    const server = await connectClient(client);

    // 验证初始流头包含目标域
    server.acceptConnection();
    expect(server.expectReceived("<stream:stream")).toContain(
      'to="example.com"',
    );

    // 验证客户端使用 PLAIN 机制发起认证
    server.send(AUTH_FEATURES);
    const auth = Parser.parse(server.expectReceived("<auth"));
    expect(auth.getAttribute("mechanism")).toBe("PLAIN");

    // 发送 SASL 成功响应，等待客户端触发 authenticated 事件
    const authenticated = waitForEvent<void>(client, "authenticated");
    server.send(`<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>`);
    await authenticated;
    server.expectReceived("<stream:stream");

    // 验证资源绑定请求的格式
    server.send(BIND_FEATURES);
    const bindRequest = Parser.parse(server.expectReceived("<iq"));
    expect(bindRequest.getAttribute("type")).toBe("set");
    expect(bindRequest.getElementsByTagName("resource")[0]?.textContent).toBe(
      "resource",
    );

    // 发送资源绑定成功响应
    const bindId = bindRequest.getAttribute("id");
    if (!bindId) throw new Error("资源绑定请求缺少 id 属性");

    const binded = waitForEvent<void>(client, "binded");
    server.send(`<iq xmlns="jabber:client" id="${bindId}" type="result">
      <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">
        <jid>test@example.com/server-resource</jid>
      </bind>
    </iq>`);
    await binded;

    // 验证最终状态和 JID
    expect(client.status).toBe(Status.BINDED);
    expect(client.jid.toString()).toBe("test@example.com/server-resource");
  });

  it("使用真实 SCRAM-SHA-1 挑战、证明和服务端签名完成认证", async () => {
    const server = await connectClient(client);

    server.acceptConnection();
    server.expectReceived("<stream:stream");
    server.send(SCRAM_AUTH_FEATURES);

    const auth = Parser.parse(server.expectReceived("<auth"));
    expect(auth.getAttribute("mechanism")).toBe("SCRAM-SHA-1");
    const exchange = createScramServerExchange(auth.textContent);

    server.send(
      `<challenge xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${exchange.challenge}</challenge>`,
    );

    let responseXml = "";
    await vi.waitFor(() => {
      responseXml = server.expectReceived("<response");
    });
    const response = Parser.parse(responseXml);
    expect(response.textContent).toBe(exchange.expectedResponse);

    const authenticated = waitForEvent<void>(client, "authenticated");
    server.send(
      `<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${exchange.success}</success>`,
    );
    await authenticated;

    server.expectReceived("<stream:stream");
    expect(client.status).toBe(Status.AUTHENTICATED);
  });

  /**
   * 验证握手完成后客户端与服务端可以双向收发 XML stanza：
   * - 客户端发送 message 给好友，服务端能收到并解析
   * - 服务端发送 message 给客户端，客户端触发 stanza 事件并解析正确
   */
  it("客户端与服务端可以双向收发 XML", async () => {
    const server = await completeHandshake(client);

    // ---- 客户端 → 服务端：发送 message ----
    client.send(`<message to="friend@example.com"><body>你好</body></message>`);
    const outgoing = Parser.parse(server.expectReceived("<message"));
    expect(outgoing.getElementsByTagName("body")[0]?.textContent).toBe("你好");

    // ---- 服务端 → 客户端：发送 message ----
    const incoming = waitForEvent<ReturnType<typeof Parser.parse>>(
      client,
      "stanza",
    );
    server.send(`<message xmlns="jabber:client" from="friend@example.com">
      <body>收到</body>
    </message>`);

    const stanza = await incoming;
    expect(stanza.getAttribute("from")).toBe("friend@example.com");
    expect(stanza.getElementsByTagName("body")[0]?.textContent).toBe("收到");
  });

  /**
   * 验证 sendAsync 可以发送 IQ 请求并通过 IQ ID 匹配机制等待对应响应：
   * - 发送 ping IQ（type=get）并设置 1s 超时
   * - 服务端返回同 id 的 result IQ 后 Promise 解析
   */
  it("sendAsync 发送 IQ 并接收对应响应", async () => {
    const server = await completeHandshake(client);
    const request = Parser.parse(`<iq type="get" id="ping-1" to="example.com">
      <ping xmlns="urn:xmpp:ping"/>
    </iq>`);

    // 发起 sendAsync 后立即验证客户端发出的 IQ
    const responsePromise = client.sendAsync(request, 1000);
    const sentIq = Parser.parse(server.expectReceived("<iq"));
    expect(sentIq.getAttribute("id")).toBe("ping-1");

    // 服务端返回匹配 id 的响应
    server.send(
      `<iq xmlns="jabber:client" type="result" id="ping-1" from="example.com"/>`,
    );

    await expect(responsePromise).resolves.toMatchObject({
      localName: "iq",
    });
  });

  /**
   * 验证服务端返回 SASL 认证失败时：
   * - 客户端触发 error 事件
   * - 错误消息包含失败原因（not-authorized）
   */
  it("服务端拒绝认证时向客户端报告错误", async () => {
    const server = await connectClient(client);
    const error = waitForEvent<Error>(client, "error");

    server.acceptConnection();
    server.expectReceived("<stream:stream");
    server.send(AUTH_FEATURES);
    server.expectReceived("<auth");
    server.send(`<failure xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
      <not-authorized/>
    </failure>`);

    await expect(error).resolves.toMatchObject({
      message: expect.stringContaining("not-authorized"),
    });
  });

  /**
   * 验证服务端在流协商阶段发送 stream error 时：
   * - 客户端触发 error 事件
   * - 错误消息包含具体的策略违规原因（policy-violation）
   */
  it("服务端发送 stream error 时向客户端报告错误", async () => {
    const server = await connectClient(client);
    const error = waitForEvent<Error>(client, "error");

    server.acceptConnection();
    server.expectReceived("<stream:stream");
    server.send(`<stream:error xmlns:stream="http://etherx.jabber.org/streams">
      <policy-violation xmlns="urn:ietf:params:xml:ns:xmpp-streams"/>
    </stream:error>`);

    await expect(error).resolves.toMatchObject({
      message: expect.stringContaining("policy-violation"),
    });
  });

  /**
   * 验证服务端断开 TCP 连接时：
   * - 客户端先触发 session:end 事件
   * - 再触发 disconnect 事件
   * - 最终状态切换为 DISCONNECTED
   */
  it("服务端断开连接时结束会话", async () => {
    const server = await completeHandshake(client);
    const sessionEnded = waitForEvent<void>(client, "session:end");
    const disconnected = waitForEvent<void>(client, "disconnect");

    server.close();

    await Promise.all([sessionEnded, disconnected]);
    expect(client.status).toBe(Status.DISCONNECTED);
  });

  /**
   * 验证底层 socket 发生错误时：
   * - 客户端触发 error 事件
   * - 错误消息透传 socket 的 Error 对象
   */
  it("Socket 错误会传递给客户端", async () => {
    const server = await connectClient(client);
    const error = waitForEvent<Error>(client, "error");

    server.fail(new Error("连接被拒绝"));

    await expect(error).resolves.toMatchObject({ message: "连接被拒绝" });
  });

  /**
   * 验证 TLS 模式下：
   * - 客户端通过 tls.connect 而非 net.Socket 建立连接
   * - 连接参数包含 host、port 和 servername
   */
  it("TLS 模式通过 tls.connect 建立连接", async () => {
    client = new XMPPConnection(TEST_JID, TEST_PASSWORD, true);

    const server = await connectClient(client);
    server.acceptConnection();
    server.expectReceived("<stream:stream");

    expect(tlsConnect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "localhost",
        port: 5222,
        servername: "localhost",
      }),
    );
    expect(Socket).not.toHaveBeenCalled();
  });
});
