# XEP-0172 — 用户昵称

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 nick 解析器** — 自动解析 `http://jabber.org/protocol/nick` 命名空间的 stanza
2. **注册 `pep:nickname` 事件** — 监听 PEP 昵称变更通知

## Stanza 字段扩展

加载后，**Message** 与 **Presence** 节新增：

```typescript
interface Message {
  nick?: string;   // 发送者的昵称（文本内容）
}
interface Presence {
  nick?: string;   // 发送者的昵称（文本内容）
}
```

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `pep:nickname` | 收到昵称更新的 PEP 通知 | `Message & { nick: string }` |

## API

| 方法 | 说明 |
|------|------|
| `setNick(nick)` | 发布自己的昵称到 PEP 节点 |
| `retrieveNick(jid)` | 查询指定用户的昵称 |
| `getSelfNick()` | 获取自己的昵称（带缓存，失败不抛异常） |

## 注意事项

- `getSelfNick()` 结果会被缓存，只请求一次
- 获取自身昵称失败时打印 warn，返回 `undefined`，不抛出异常（容错设计）
- XEP-0402（书签）会使用 `getSelfNick()` 作为房间昵称回退