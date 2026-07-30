# XEP-0199 — XMPP Ping / Keep-Alive

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:ping`
2. **自动响应 ping** — 收到 `type='get'` 含 `<ping>` 的 IQ 时，自动回复 `type='result'`
3. **Keep-Alive 心跳** — 服务器支持时，自动启动周期性 ping（默认 5 分钟间隔）
4. **检查服务器支持** — 检查服务器 disco 特性后才启动 Keep-Alive

## Stanza 字段扩展

不直接扩展 stanza 接口。

## 可监听事件

无专门事件。

## API

| 方法 | 说明 |
|------|------|
| `ping(to, timeout?)` | 向指定实体发送 ping → `Promise<latency_ms>` |

## 配置

```typescript
XEP0199.config.keepalive = false;    // 禁用 Keep-Alive（默认 true）
XEP0199.config.interval = 60_000;    // 心跳间隔 ms（默认 300_000）
XEP0199.config.timeout = 10_000;     // ping 超时 ms（默认 30_000）
```

## 注意事项

- Keep-Alive 仅在服务器支持 ping 时启用
- 服务器不支持时打印 error 日志，不会禁用插件
- `ping()` 返回的是往返耗时（毫秒），超时抛出 `TimeoutError`