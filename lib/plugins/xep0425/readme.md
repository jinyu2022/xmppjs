# XEP-0425 — 审核消息撤回

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 moderation 解析器** — 自动解析 `urn:xmpp:message-moderate:1` 的 `<moderate>` / `<moderated>` 元素
2. **注册 `message:moderated` 事件** — 收到审核撤回通知时触发

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  moderated?: {
    id: string;        // 被撤回的消息 ID
    by?: string;       // 审核者 JID
    reason?: string;   // 审核原因
  }
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `message:moderated` | 消息被审核员撤回 | `Message & { moderated: {...} }` |

## API

| 方法 | 说明 |
|------|------|
| `moderate(to, id, reason?)` | 同步发送审核撤回请求到 MUC 服务 |
| `moderateAsync(to, id, reason?)` | 异步发送并等待服务器结果 |

## 注意事项

- 审核请求发送给 **MUC 服务**，不是用户
- 需要使用 MUC 分配的 **XEP-0359 stanza-id**
- 审核员需要 moderator 或 admin 角色
- 依赖 **XEP-0030** 和 **XEP-0424**（消息撤回）
- `moderateAsync()` 返回 Promise，成功返回空，失败抛出异常