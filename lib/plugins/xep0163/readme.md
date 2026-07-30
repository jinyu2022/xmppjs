# XEP-0163 — 个人事件协议

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 pubsub event 解析器** — 自动解析 `http://jabber.org/protocol/pubsub#event` 命名空间，将 `<event>` 元素解析为结构化对象

## Stanza 字段扩展

加载后，**Message** 节新增：

```typescript
interface Message {
  event?: {
    node?: string;
    retracts?: string[];
    item?: PubsubEventItem;
    // 还可能含: collection / configuration / delete / purge / subscription
  }
}
```

## API

| 方法 | 说明 |
|------|
| `publish(node, data)` | 发布数据到 PEP 节点 |
| `retrieveItems(jid, node, max?)` | 检索 PEP 节点数据 |
| `retract(node, id)` | 撤回 PEP 节点项目 |

## 注意事项

- 依赖 **XEP-0060**（PubSub）和 **XEP-0030**（服务发现）
- PEP 使用用户的 bare JID 作为 PubSub 服务地址
- `+notify` 特性用于接收好友的 PEP 更新通知
- 是 XEP-0084（头像）、XEP-0172（昵称）、XEP-0402（书签）的底层传输