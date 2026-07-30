# XEP-0198 — 流管理

## 自动行为

加载此插件后，Connection 会自动：

1. **拦截发送** — 所有发出的 iq/message/presence 自动计数（outbound++），按间隔触发 ACK 请求
2. **拦截接收** — 所有收到的 iq/message/presence 自动计数（inbound++）
3. **响应 ACK 请求** — 收到服务器 `<r>` 元素时，自动发送 `<a>` 应答
4. **自动启用** — 在 resource 绑定后检查 stream features，有 `urn:xmpp:sm:3` 则发送 enable 请求
5. **自动会话恢复** — 断线后自动重连并发送 resume 请求，恢复未确认的消息
6. **指数退避重连** — 内置重连定时器，失败次数越多等待越久

### 状态机

| 状态          | 值  | 说明                     |
| ------------- | --- | ------------------------ |
| `DISABLE`     | 0   | 未启用                   |
| `ENABLE_SENT` | 1   | 已发送启用请求，等待确认 |
| `ENABLE`      | 2   | 已启用流管理             |

## Stanza 字段扩展

不直接扩展 stanza 接口。流管理使用独立的 `<r>` / `<a>` / `<enable>` / `<resume>` 元素。

## 可监听事件

无专门事件。流管理完全自动化运行。

## 配置

```typescript
XEP0198.interval = 5;  // 每 N 条消息请求一次 ACK（默认 5）
```

## 注意事项

- 启用后，服务器会返回 `<enabled>` 确认，包含 `id`（恢复 ID）和 `resume` 属性
- 重连逻辑在 status 变为 `disconnected` 且之前已启用时触发
- 流恢复期间收到的 stanza 会被暂存，恢复后统一处理
- 此插件确保**消息不丢失**，是 XMPP 可靠传输的核心