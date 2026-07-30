# XEP-0280 — 消息碳副本

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:carbons:2`
2. **注册 carbon 解析器** — 自动解析 message 中的 `<received>` / `<sent>` 碳副本元素
3. **检查服务器支持** — 在 `session:start` 后检查服务器 disco 特性，支持则自动启用
4. **自动启用** — 服务器支持时发送 enable IQ

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  carbon?: {
    type: 'received' | 'sent';
    forward: Forwarded;   // 来自 XEP-0297 的 forwarded 结构
  }
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `carbon:received` | 其他客户端收到的消息 | Message（carbon.type='received'） |
| `carbon:sent` | 其他客户端发出的消息 | Message（carbon.type='sent'） |

## 注意事项

- 自动检测，无需手动调用 `enable()`
- 收到的 carbon 消息中，`message.carbon.forward.message` 是原始消息
- 服务器不支持时打印 warn，不影响正常通信
- 依赖 **XEP-0030** 和 **XEP-0297**（节转发）