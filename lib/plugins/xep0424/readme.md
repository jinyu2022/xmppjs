# XEP-0424 — 消息撤回

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:message-retract:1`
2. **注册 retraction 解析器** — 自动解析撤回相关的 `<retract>` / `<retracted>` 元素
3. **注册 `message:retract` 事件** — 收到撤回请求时触发

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  retract?: { id: string };        // 收到撤回请求
  retracted?: {                    // 消息已被撤回的标记
    id: string;
    stamp?: Date;                  // 撤回时间
  };
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `message:retract` | 收到撤回请求 | `Message & { retract: { id } }` |

## API

| 方法 | 说明 |
|------|------|
| `retract(to, id, msgType?, fallbackText?)` | 发送撤回请求，msgType 可选 chat/groupchat/normal |

## 注意事项

- 撤回的消息 ID 应使用 **XEP-0359 的 stanza-id**（服务端分配的稳定 ID）
- `fallbackText` 可提供给不支持撤回的旧客户端显示
- 撤回请求只发送一次，服务器不保证一定能撤回
- 群聊撤回依赖 **XEP-0425**（审核撤回）机制