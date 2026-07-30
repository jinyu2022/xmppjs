# XEP-0184 — 消息回执

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 receipts 解析器** — 自动解析 `urn:xmpp:receipts` 命名空间的 `<request>` / `<received>` 元素
2. **发送消息自动添加回执请求** — 拦截所有发送的 message（有 body 的），自动附加 `<request xmlns='urn:xmpp:receipts'/>`
3. **自动回复回执** — 收到含 `<request>` 的消息时，自动发送 `<received id='...'/>` 回复
4. **群聊豁免** — 对 `type='groupchat'` 的消息不请求回执（遵循规范）
5. **错误豁免** — 对 `type='error'` 的消息不请求回执

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  receipts?: {
    id?: string;     // 仅 received 类型有
    type: 'received' | 'request';
  }
}
```

## 可监听事件

无专门事件。通过 `connection.on('message', ...)` 检查 `message.receipts` 字段即可。

## 注意事项

- **完全自动化**，不需要任何手动调用
- 发送消息时自动附加请求，收到请求时自动回复
- 如需检查某条消息是否已被接收方确认，监听 message 事件检查 `receipts.type === 'received'`
- 不会对 groupchat 和 error 消息请求回执