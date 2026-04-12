# XMPP 核心登录流程 (RFC 6120)

本文档概述了 XMPP 客户端连接到服务器并建立会话的核心流程，主要基于 RFC 6120 (XMPP Core) 的规范。理解这些步骤对于实现 `Connection` 和 `CoreSession` 逻辑至关重要。

整个流程是一个多阶段的**流协商 (Stream Negotiation)**过程，直到客户端完成认证和资源绑定，才能开始发送消息节（Stanza）。

## 1. 网络连接 (TCP Binding)

这是建立 XMPP 会话的第一步，涉及底层网络连接。

*   **客户端动作:**
    1.  **DNS 解析 FQDN** (Section 3.2): 解析服务器的完全限定域名（FQDN）以获取 IP 地址和端口。
    2.  **建立 TCP 连接** (Section 3.1): 通过解析得到的地址和端口建立持久的 TCP 连接。
*   **对应方法/函数 (建议):** `resolveHost()`, `openTcpConnection()`

## 2. 流建立 (Stream Establishment)

在 TCP 连接建立后，客户端和服务器通过交换 XML 流头部来启动 XMPP 流。

*   **客户端动作 (C:):**
    *   **发送初始流头部** (Section 4.2):
    ```xml
    <?xml version='1.0'?>
    <stream:stream 
        xmlns="jabber:client" 
        version="1.0" 
        xmlns:stream="http://etherx.jabber.org/streams" 
        to="im.example.com" 
        xml:lang="zh-CN"
    >
    ```
*   **服务器动作 (S:):**
    *   **响应流头部** (包含 Stream ID):
    ```xml
    <?xml version='1.0'?>
    <stream:stream
        from='im.example.com'
        id='t7AMCin9zjMNwQKDnplntZPIDEI='
        to='juliet@im.example.com'
        version='1.0'
        xml:lang='en'
        xmlns='jabber:client'
        xmlns:stream='http://etherx.jabber.org/streams'>
    ```
*   **对应方法/函数 (建议):** `sendInitialStreamHeader()`

## 3. 流协商：传输层安全 (TLS Negotiation)

客户端和服务器协商是否使用 TLS 来加密连接。

*   **服务器动作 (S:):**
    *   **发送流特性** (包含 `<starttls/>`):
    ```xml
    <stream:features>
        <starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'>
            <required/>
        </starttls>
    </stream:features>
    ```
*   **客户端动作 (C:):**
    *   **发送 `<starttls/>` 命令** (Section 5.4.2.1):
    ```xml
    <starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>
    ```
*   **服务器动作 (S:):**
    *   **响应 `<proceed/>`:**
    ```xml
    <proceed xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>
    ```
    *   **执行 TLS 握手** (Section 5.4.3): 客户端和服务器在底层 TCP 连接上执行 TLS 握手。
*   **对应方法/函数 (建议):** `handleStreamFeatures()`, `sendStartTLS()`, `negotiateTLS()`

## 4. 流重启 (Post-TLS Stream Restart)

TLS 握手成功后，必须重启 XML 流以清除旧的流上下文，并在加密通道上继续协商。

*   **客户端动作 (C:):**
    *   **发送新的流头部** (Section 5.4.3.3):
    ```xml
    <?xml version='1.0'?>
    <stream:stream
        from='juliet@im.example.com'
        to='im.example.com'
        version='1.0'
        xml:lang='en'
        xmlns='jabber:client'
        xmlns:stream='http://etherx.jabber.org/streams'>
    ```
*   **服务器动作 (S:):**
    *   **响应新的流头部** (新的 Stream ID):
    ```xml
    <?xml version='1.0'?>
    <stream:stream
        from='im.example.com'
        id='vgKi/bkYME8OAj4rlXMkpucAqe4='
        to='juliet@im.example.com'
        version='1.0'
        xml:lang='en'
        xmlns='jabber:client'
        xmlns:stream='http://etherx.jabber.org/streams'>
    ```
*   **对应方法/函数 (建议):** `restartStream()`

## 5. 流协商：认证 (SASL Negotiation)

在安全通道上，客户端使用 SASL (Simple Authentication and Security Layer) 机制进行身份认证。

*   **服务器动作 (S:):**
    *   **发送流特性** (包含 `<mechanisms/>`):
    ```xml
    <stream:features>
        <mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>
            <mechanism>SCRAM-SHA-1-PLUS</mechanism>
            <mechanism>SCRAM-SHA-1</mechanism>
            <mechanism>PLAIN</mechanism>
        </mechanisms>
    </stream:features>
    ```
*   **客户端动作 (C:):**
    *   **选择机制并认证** (以 SCRAM-SHA-1 为例，包含初始响应):
    ```xml
    <auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl"
        mechanism="SCRAM-SHA-1">
        biwsbj1qdWxpZXQscj1vTXNUQUF3QUFBQU1BQUFBTlAwVEFBQUFBQUJQVTBBQQ==
    </auth>
    ```
*   **服务器动作 (S:):**
    *   **挑战** (如果需要):
    ```xml
    <challenge xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
        cj1vTXNUQUF3QUFBQU1BQUFBTlAwVEFBQUFBQUJQVTBBQWUxMjQ2OTViLTY5Y
        ...
    </challenge>
    ```
*   **客户端动作 (C:):**
    *   **响应挑战:**
    ```xml
    <response xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
        Yz1iaXdzLHI9b01zVEFBd0FBQUFNQUFBQU5QMFRBQUFBQUFCUFUwQUFlMTI0N
        ...
    </response>
    ```
*   **服务器动作 (S:):**
    *   **认证成功:**
    ```xml
    <success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>
        dj1wTk5ERlZFUXh1WHhDb1NFaVc4R0VaKzFSU289
    </success>
    ```
    *   **或者 认证失败 (分支):**
    ```xml
    <failure xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>
        <not-authorized/>
    </failure>
    ```
*   **客户端动作 (C:) (如果失败):**
    *   **重试认证** (如果未达到重试上限，发送新的 `<auth/>`):
    ```xml
    <auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>...</auth>
    ```
*   **对应方法/函数 (建议):** `handleStreamFeatures()`, `performSASLAuth()`, `handleSASLChallenge()`, `handleSASLSuccess()`, `handleSASLFailure()`

## 6. 流重启 (Post-SASL Stream Restart)

SASL 认证成功后，必须再次重启 XML 流以清除旧的流上下文，并在认证后的通道上继续协商。

*   **客户端动作 (C:):**
    *   **发送新的流头部** (Section 6.4.6):
    ```xml
    <stream:stream
        from='juliet@im.example.com'
        to='im.example.com'
        version='1.0'
        xml:lang='en'
        xmlns='jabber:client'
        xmlns:stream='http://etherx.jabber.org/streams'>
    ```
*   **服务器动作 (S:):**
    *   **响应新的流头部** (新的 Stream ID):
    ```xml
    <stream:stream
        from='im.example.com'
        id='gPybzaOzBmaADgxKXu9UClbprp0='
        to='juliet@im.example.com'
        version='1.0'
        xml:lang='en'
        xmlns='jabber:client'
        xmlns:stream='http://etherx.jabber.org/streams'>
    ```
*   **对应方法/函数 (建议):** `restartStream()`

## 7. 资源绑定 (Resource Binding)

客户端将一个唯一的资源标识符绑定到其裸 JID (`user@domain`)，以形成完整的 JID (`user@domain/resource`)。

*   **服务器动作 (S:):**
    *   **发送流特性** (包含 `<bind/>`):
    ```xml
    <stream:features>
        <bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/>
    </stream:features>
    ```
*   **客户端动作 (C:):**
    *   **发送 IQ set 绑定资源** (Section 7.7.1):
    ```xml
    <iq id='yhc13a95' type='set'>
        <bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'>
            <resource>balcony</resource>
        </bind>
    </iq>
    ```
*   **服务器动作 (S:):**
    *   **响应 IQ result** (包含完整 JID):
    ```xml
    <iq id='yhc13a95' type='result'>
        <bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'>
            <jid>juliet@im.example.com/balcony</jid>
        </bind>
    </iq>
    ```
*   **对应方法/函数 (建议):** `handleStreamFeatures()`, `sendBindIQ()`, `handleBindResult()`

## 8. 会话建立 (Session Establishment)

在资源绑定之后，客户端被认为已登录。如果服务器支持 XEP-0357 等会话管理扩展，可能需要额外的 IQ 交换来建立会话。

*   **客户端动作 (C:):**
    *   **发送 IQ set 建立会话** (可选): (如果服务器支持 XEP-0357 等，可能需要发送 IQ set 建立会话)。
*   **服务器动作 (S:):**
    *   **响应 IQ result** (可选)。
*   **对应方法/函数 (建议):** `establishSession()`

## 9. 节交换 (Stanza Exchange)

会话建立完成后，客户端可以开始发送和接收 XMPP 节（Stanza）。

*   **客户端动作 (C:):**
    *   **发送节** (例如 Message):
    ```xml
    <message from='juliet@im.example.com/balcony'
             to='romeo@example.net'
             xml:lang='en'>
        <body>Art thou not Romeo, and a Montague?</body>
    </message>
    ```
*   **服务器动作 (S:):**
    *   **接收并路由/投递节。**
*   **对应方法/函数 (建议):** `sendStanza()`, `onStanza()`

## 10. 流关闭 (Stream Closure)

当客户端或服务器希望终止会话时，会执行流关闭握手。

*   **客户端动作 (C:):**
    *   **发送流关闭标签** (Section 4.4):
    ```xml
    </stream:stream>
    ```
*   **服务器动作 (S:):**
    *   **响应流关闭标签** 并关闭 TCP 连接:
    ```xml
    </stream:stream>
    ```
*   **对应方法/函数 (建议):** `disconnect()`, `sendStreamClose()`

### 关键概念和实现要点

1.  **流重启 (Stream Restart):**
    *   在 **TLS 成功**和 **SASL 成功**后，客户端和服务器都必须发送一个新的 `<stream:stream>` 头部，以清除旧的流上下文，并在新的安全/认证通道上继续协商。
    *   底层 TCP 连接保持不变。
    *   服务器必须为新的流生成一个新的 `id` 属性。

2.  **流特性 (Stream Features):**
    *   服务器通过 `<stream:features>` 元素告知客户端当前阶段可以协商的特性（例如，TLS、SASL 机制、资源绑定）。
    *   客户端必须按顺序协商这些特性：**TLS (加密) -> SASL (认证) -> 资源绑定 (地址)**。

3.  **资源绑定 (Resource Binding):**
    *   这是客户端登录的最后一步，通过 IQ 节完成。
    *   成功后，客户端获得完整的 JID (`user@domain/resource`)，并被允许发送消息节。

4.  **错误处理:**
    *   **流错误 (Stream Error):** 发生在流协商阶段，会导致流关闭和 TCP 连接终止（例如 `<not-authorized/>`, `<host-unknown/>`）。
    *   **节错误 (Stanza Error):** 发生在节交换阶段，通过 IQ、Message 或 Presence 节的 `type='error'` 属性返回（例如 `<conflict/>`, `<bad-request/>`）。


