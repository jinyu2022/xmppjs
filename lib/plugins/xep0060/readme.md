# XEP-0060 — 发布-订阅

## 自动行为

此模块不实现 Plugin 接口，不会自动加载。仅提供 `Pubsub` 基类的静态方法，供 **XEP-0163（PEP）** 等插件继承使用。

## API

| 方法 | 说明 |
|------|------|
| `Pubsub.createRetrieveItemsIq(to, node, max?, id?)` | 构造检索节点项目的 IQ（get） |
| `Pubsub.createPublishIq(publish, options?)` | 构造发布节点的 IQ（set） |
| `Pubsub.createRetractIq(node, id, notify?)` | 构造撤回节点的 IQ（set） |
| `Pubsub.parseEventEl(xml)` | 解析 `<event>` 中的 items/retracts 等 |

### parseEventEl 返回值

```typescript
{
  node?: string;
  retracts?: string[];
  item?: PubsubEventItem;
  // 还可能含: collection / configuration / delete / purge / subscription
}
```

## 注意事项

- 命名空间分离：基础操作用 `http://jabber.org/protocol/pubsub`，事件通知用 `...#event`
- 最新的规范只允许一个 item，解析器已按此处理
- 此模块是 PEP 和所有基于发布的 XEP 的底层实现