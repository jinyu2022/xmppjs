# XEP-0402 — PEP 原生书签

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:bookmarks:1+notify`
2. **注册 conference 解析器** — 自动解析 `urn:xmpp:bookmarks:1` 命名空间的 `<conference>` 元素
3. **自动加入房间** — 在 `session:start` 时，检索所有书签并**自动加入 `autojoin=true` 的房间**
4. **昵称回退** — 房间没有指定 nick 时，自动使用 `XEP-0172.getSelfNick()` → JID localpart

## Stanza 字段扩展

不直接扩展 stanza。书签数据通过 API 返回。

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `bookmark:update` | 收到书签更新的 PEP 通知 | Message（含 conference 数据） |
| `bookmark:delete` | 收到书签删除的 PEP 通知 | Message（含 retracts 数据） |

## API

| 方法 | 说明 |
|------|------|
| `retrieveBookmarks()` | 获取所有书签 → `Promise<Conference[]>` |
| `addBookmark(conf)` | 添加书签（支持 name / nick / password / autojoin） |
| `removeBookmark(jid)` | 删除书签 |
| `bookmarks` | 内存中的书签数组 |

### Conference 接口

```typescript
interface Conference {
  jid: string;
  name?: string;
  autojoin?: boolean;  // 是否自动加入
  nick?: string;       // 房间昵称
  password?: string;   // 房间密码
}
```

## 注意事项

- 仅当 **XEP-0045** 也已加载时才会自动加入房间
- autojoin 失败时打印 error，不会阻断连接
- 书签数据存储在 PEP 中，跨客户端同步