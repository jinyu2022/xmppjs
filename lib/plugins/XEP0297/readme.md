# XEP-0297 — 节转发

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 forwarded 解析器** — 自动解析 `urn:xmpp:forward:0` 命名空间的 `<forwarded>` 元素
2. **注册 `forward` 事件** — 在收到包含 `<forwarded>` 的消息时触发

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  forward?: XMPPElement;  // 原始 forwarded XML 元素
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `forward` | 收到含 `<forwarded>` 的消息 | `Message & { forward: Forwarded }` |

### Forwarded 结构

```typescript
type Forwarded = {
  delay?: XMPPElement | null;
} & (
  { message: XMPPElement } |
  { presence: XMPPElement } |
  { iq: XMPPElement }
)
```

## 注意事项

- 主要被 **XEP-0280（碳副本）** 使用，用于封装转发的消息
- 被转发节中可能包含 delay 元素（由 XEP-0203 解析）
- `message.forward` 存储的是原始 XMPPElement，`forward` 事件回调中是解析后的 Forwarded 对象