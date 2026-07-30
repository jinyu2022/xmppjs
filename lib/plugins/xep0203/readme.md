# XEP-0203 — 延迟投递

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 delay 解析器** — 自动解析 `urn:xmpp:delay` 命名空间的 `<delay>` 元素

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  delay?: {
    stamp: Date;       // 原始发送时间
    from: string;      // 原始发送者 JID
    reason?: string;   // 延迟原因
  }
}
```

## 可监听事件

无专门事件。在 `message` 事件回调中检查 `message.delay` 字段。

## 注意事项

- 通常出现在**离线消息**或服务器缓存的消息中
- `delay.stamp` 是消息原本的发送时间，`message` 本身的 timestamp 是当前投递时间
- 需要 XEP-0082（日期格式化）来解析时间戳