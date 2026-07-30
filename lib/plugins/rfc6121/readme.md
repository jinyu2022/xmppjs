# RFC6121 — XMPP 即时消息和存在（花名册）

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 stanza 解析器** — 自动解析命名空间为 `jabber:iq:roster` 的 IQ，将 `<query>` 子元素解析为 `{ roster: Roster[] }` 对象
2. **注册花名册推送事件** — 监听服务器主动推送的 `type='set'` 的 roster IQ，触发 `roster:update` 事件
3. **自动应答花名册推送** — 收到 `roster:update` 事件后自动回复 `type='result'` 的 IQ

## Stanza 字段扩展

加载后，**IQ** 节新增字段：

```typescript
interface Iq {
  roster?: Roster[];
}
interface Roster {
  approved: boolean;
  jid: string;
  name?: string;
  ask?: 'subscribe';
  subscription: 'none' | 'to' | 'from' | 'both' | 'remove';
}
```

## 可监听事件

| 事件 | 触发时机 | 回调参数 |
|------|---------|----------|
| `roster:update` | 服务器推送花名册变更 | `Iq`（type='set'，含 roster 数据） |

> 该事件触发后插件已自动回复 `type='result'`，只需处理本地状态同步。

## API

| 方法 | 说明 |
|------|------|
| `getRoster()` | 获取完整花名册 → `Promise<Roster[]>` |
| `setRoster(jid, name?, group?)` | 添加或修改联系人 |
| `removeRoster(jid)` | 删除联系人（同时取消所有订阅关系） |

## 注意事项

- `removeRoster()` 同时也取消了所有订阅关系
- 花名册的 `subscription` 状态由服务器根据双向订阅情况自动计算