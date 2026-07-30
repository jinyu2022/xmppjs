# XEP-0308 — 消息更正

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:message-correct:0`
2. **注册 replace 解析器** — 自动解析 `<replace id='...'/>` 元素
3. **注册 `message:correct` 事件** — 收到消息更正时触发

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  replace?: { id: string };   // 被更正的原消息 ID
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `message:correct` | 收到带 `<replace>` 的消息 | `Message & { replace: { id } }` |

## API

| 方法 | 说明 |
|------|------|
| `correctMessage(to, replaceId, newBody, type?)` | 发送更正消息，type 可选 chat/groupchat/normal，默认 chat |
| `correctMessage(originalMessage, newBody)` | 基于原 Message 对象发送更正，自动提取 to/type/id |
| `isCorrection(msg)` | 检查消息是否包含 `<replace/>` 更正标记（类型收窄） |

## 注意事项

- **更正消息本身需要有唯一 id** — 调用方应保证发送时设置 `id` 属性，以便后续可被再次更正
- **多次更正都指向原始消息** — 后续更正应使用原消息 ID，而非上一次更正消息的 ID
- **需要 XEP-0030** — 依赖服务发现插件来声明特性支持
- 更正应仅修改消息正文内容（`<body>`），不应改变 stanza 类型或元数据
