# xmppts — XMPP.js 即时通讯库

基于 TypeScript 的 XMPP 协议库，支持浏览器和 Node.js 环境。采用插件化架构实现多种 XMPP 扩展协议（XEP）。

## 快速命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | Vite 开发模式 |
| `npm run build` | `tsc && vite build`（类型检查 + 打包）|
| `npm run ts-check` | `tsc --noEmit`（仅类型检查）|
| `npm run ts-build` | `tsc && tsc-alias`（类型检查 + 路径别名转换）|
| `npm test` | Vitest 运行测试 |
| `npm run lint` | ESLint 检查 |

> **注意**：构建输出到 `dist/`，`preserveModules` 保持源文件目录结构。

## 项目结构

```
lib/
├── client.ts           # Client 类（继承 Connection）
├── connection.ts       # Connection 核心（插件/拦截器/Stanza 路由）
├── stanza.ts           # StanzaBase / Iq / Message / Presence
├── JID.ts              # JID 解析
├── errors.ts           # XMPPError + TimeoutError
├── dns.ts              # DNS SRV 解析（含 DoH 回退）
├── log.ts              # 日志（loglevel 封装）
├── ltx/                # 自定义 XML 解析引擎（含 XMPPElement，接口对标 MDN DOM Element 标准实现）
├── transport/          # 传输层（TCP/TLS + WebSocket）
├── auth/               # SASL 认证（SCRAM-SHA-1）
└── plugins/            # 所有 XEP 插件实现
    ├── index.ts        # barrel 导出 + plugins 常量映射
    ├── types.ts        # Plugin / PluginConstructor 接口
    ├── rfc6121/        # roster CRUD
    ├── xep0030/        # 服务发现
    ├── xep0045/        # MUC 群聊
    └── ...             # 20+ 个 XEP 实现
```

## 架构核心概念

### 插件系统

一切 XMPP 扩展通过 Plugin 接口实现：

- **接口**：[lib/plugins/types.ts](lib/plugins/types.ts) — `PluginInstance`（`init()`）+ `PluginConstructor`（`dependencies`）
- **依赖解析**：`Connection` 在 `connect()` 时自动递归解析 `static dependencies`，注册缺失插件
- **三种注册机制**：
  1. `registerStanzaPlugin(ns, handler)` — XML 命名空间 → JS 对象映射
  2. `registerInterceptor(type, handler)` — 发送/接收拦截管线
  3. `registerEventPlugin(eventName, { tagName, matcher })` — 基于 Stanza 内容匹配的自定义事件
- **三种插件形态**：标准 Plugin（实现 `init()`）、纯工具类（static 方法，不注册）、独立连接（XEP0077 使用独立 socket）
- **插件间通信**：通过 `connection.XEP0030!` 强类型访问其他插件实例

### 连接生命周期

详见 [lib/LIFECYCLE.md](lib/LIFECYCLE.md)：

1. **配置注册** — `new Connection()` + `registerPlugin()`
2. **初始化** — 依赖解析 → 插件实例化 → `init()` 调用
3. **流协商** — TCP → TLS → SASL 认证 → 资源绑定
4. **活跃会话** — 发送管线（send/sendAsync）→ 接收管线（拦截器 → 转换器 → 分发）
5. **终止** — 清理监听器 → 关闭流 → 断开连接

### 传输层状态机

[lib/transport/typing.ts](lib/transport/typing.ts) 定义了完整的连接状态常量：`DISCONNECTED(0)` → `CONNECTING(1)` → ... → `BINDED(8)` → `SESSIONSTART(10)`

## 命名约定

| 类别 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `connection.ts`, `xep0030/` |
| 插件目录 | kebab-case | `xep0045/`（例外：`XEP0297/` 大写） |
| 类 | PascalCase | `XMPPConnection`, `StanzaBase` |
| 插件类 | `XEP<编号>` | `XEP0030`, `XEP0199` |
| 方法/函数 | camelCase | `sendAsync`, `registerPlugin` |
| 类型/接口 | PascalCase | `Plugin`, `DataForm` |
| 事件名 | kebab-case with colons | `session:start`, `muc:join` |
| 静态常量 | UPPER_SNAKE | `NS`, `DEFAULT_TIMEOUT` |

## 导入/导出约定

- **路径别名**：`@` → `lib/`（vite.config.ts + tsconfig.json paths）
- **Barrel 导出**：[lib/plugins/index.ts](lib/plugins/index.ts) 集中导出所有插件 + `plugins` 常量映射表
- **类型扩充**：XEP 插件使用 `declare module` 扩充 Stanza 类型和 SocketEventMap（见 [xep0424/index.ts](lib/plugins/xep0424/index.ts)）
- **默认导出** vs **命名导出**：两者混用，无统一风格

## 测试规范

- **框架**：Vitest（配置在 [vite.config.ts](vite.config.ts) 中）
- **目录**：`test/`，子目录按模块组织（`test/ltx/`, `test/plugins/`）
- **模式**：集成测试使用真实 XMPP 凭据，无 mock/stub
- **异步等待**：`new Promise<void>(resolve => connection.once("event", resolve))`
- **运行**：`npm test`

## 潜在陷阱

1. **shims 模块已启用**：使用新的XMPPElement类
2. **XMPPError 本地误用**：`connection.ts` 中用 `XMPPError` 做本地参数验证（本应用于服务器错误响应）
3. **Presence.show 类型不安全**：`stanza.ts` 中 `textContent as presShow` 没有运行时验证
4. **XEP0077 独立架构**：带内注册使用独立 socket，不实现标准 Plugin 接口，不走常规连接生命周期
5. **路径别名与 tsc-alias**：构建需 `npm run ts-build`（tsc + tsc-alias）确保 `@/` 别名在输出中正确转换
6. **事件内存泄漏**：`sendAsync` 的 `once` 监听器通过 `setTimeout` 清理，确保超时后不残留

## 现有文档

- [lib/LIFECYCLE.md](lib/LIFECYCLE.md) — 连接生命周期与状态机
- [lib/transport/README.md](lib/transport/README.md) — XMPP 核心登录流程（RFC 6120）
- [lib/README.md](lib/README.md) — 已实现协议列表（待完善）

## 已安装的技能

项目已配置以下全局编码技能（来自 `.agents/skills/`）：
- **modern-javascript-patterns**：ES6+ 现代 JS 模式
- **typescript-advanced-types**：TypeScript 高级类型系统

这些技能由 AI 编码助手在交互中按需加载。
