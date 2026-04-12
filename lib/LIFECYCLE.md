# XMPPTS 库生命周期说明文档

本文档详细说明了 `xmppts` 库的连接生命周期、状态机转换、插件系统以及数据流转机制。

## 1. 核心组件架构

- **`Connection` (lib/connection.ts)**: 高层抽象类，负责插件生命周期管理、Stanza 解析与分发、拦截器管线以及异步请求的 Promise 映射。
- **`XMPPConnection` (lib/transport/tcp.ts)**: 底层传输类，负责 TCP/TLS 连接、DNS SRV 解析、XMPP 流协商（SASL 认证、资源绑定）。
- **`Status` (lib/transport/typing.ts)**: 定义了连接过程中的所有状态常量。

## 2. 详细生命周期阶段

### 2.1 配置与注册阶段 (Pre-connection)
在调用 `connect()` 之前，程序处于静态配置阶段：
1.  **构造实例**: `new Connection(jid, password, options)`。解析 JID，合成连接 URL。
2.  **插件注册 (`registerPlugin`)**: 插件构造函数被添加到 `pendingPlugins` 待处理队列。此时插件尚未实例化。

### 2.2 初始化与注入阶段 (Initialization)
当调用 `async connect()` 时，但在网络握手之前：
1.  **插件依赖解析 (`checkAndRegisterDep`)**: 递归扫描插件的静态 `dependencies` 属性，自动注册缺失的依赖插件。
2.  **插件实例化**: 
    *   执行 `new Plugin(connection)`。
    *   调用每个插件实例的 `init()` 方法。
3.  **插件扩展能力注入**: 插件通常在 `init()` 中通过以下接口扩展功能：
    *   `registerStanzaPlugin()`: 注册 XML 命名空间到 JS 对象的映射器。
    *   `registerInterceptor()`: 插入 `send`/`receive` 拦截管线。
    *   `registerEventPlugin()`: 定义基于 Stanza 内容匹配的自定义事件。

### 2.3 底层流协商阶段 (Negotiation)
底层状态机（`XMPPConnection`）的流转过程：
1.  **`Status.CONNECTING` (1)**: 发起 TCP 握手。
2.  **`Status.CONNECTED` (2)**: TCP 建立，发送第一个 XML 流起始标签。
3.  **`Status.STREAM_START` (3)**: 已发送流头，等待服务器返回特性。
4.  **`Status.STREAM_ESTABLISHED` (4)**: 收到特性列表。
5.  **SASL 认证 (`Status.AUTHENTICATING` -> `AUTHENTICATED`)**: 自动处理认证往返。认证成功后，底层会自动**重启流**并发送第二次流头。
6.  **资源绑定 (`Status.BINDING` -> `BINDED`)**: 绑定后分配 Full JID。
7.  **触发事件**: 底层触发 `binded` -> 高层发出 `session:start`。

### 2.4 活跃会话阶段 (Active Session)
连接建立后，处理 Stanza 的收发流转。

#### 发送管线 (Send Pipeline)
1.  **`send(stanza)`**: 注入默认属性（`id`, `from`, `xmlns`），执行 `send` 拦截器链，最后通过 Socket 发送。
2.  **`sendAsync(stanza)`**: 自动生成 ID，注册**一次性监听器**，设置 30s 超时计时器，返回 Promise。

#### 接收管线 (Receive Pipeline)
1.  **底层**: Parser 解析出完整 XML Tree，触发 `stanza` 事件。
2.  **拦截器**: 执行 `receive` 拦截器链。
3.  **转换器 (`traverseAndTransform`)**: 递归扫描子节点，将匹配 `StanzaPlugin` 的 XML 节点转换为结构化 JS 对象。
4.  **分发**: 发出 `message`, `iq`, `presence` 等具体事件。

### 2.5 终止阶段 (Termination)
调用 `connection.disconnect()` 时：
1.  **高层清理**: `removeAllListeners()` 移除所有业务回调，清空插件、拦截器和处理器映射表。
2.  **流关闭**: 向服务器发送 `</stream:stream>`。
3.  **物理断开**: `socket.end()` 关闭连接，状态机回滚到 `DISCONNECTED` (0)。

## 3. 核心事件汇总表

| 事件名称 | 触发时机 | 典型用途 |
| :--- | :--- | :--- |
| `connect` | TCP/WS 握手完成且流开启 | 日志记录连接耗时 |
| `session:start` | 资源绑定成功，连接完全就绪 | **业务入口**，在此发送在线状态 |
| `stanza` | 收到任何完整 XML 节 | 插件拦截原始 XML 数据 |
| `message/iq/p...` | 经过解析和插件转换后的业务数据 | 处理聊天消息、回复请求 |
| `disconnect` | 物理连接彻底断开 | 触发自动重连逻辑 |

## 4. 错误处理

- **`TimeoutError`**: `sendAsync` 请求在规定时间内未收到响应。
- **`XMPPError`**: 业务层错误（如 IQ 错误响应）。
- **`Status.AUTHFAIL`**: SASL 认证失败，将直接触发断开连接。

