# XEP-0045 — 多用户聊天

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `http://jabber.org/protocol/muc`
2. **注册 `muc#user` 解析器** — 自动解析 presence/message 中的 muc 信息
3. **注册 7 个 MUC 事件** — 见下表
4. **维护房间状态** — `rooms` Map 追踪所有已加入房间的成员列表

## 类属性

### 实例属性

#### `rooms`

类型：`Map<string, RoomState>`

```typescript
interface RoomState {
  /** 当前会话在该房间使用的昵称 */
  nick: string;
  /** 房间内其他 occupant 的状态表 */
  occupants: Map<string, MUCUser>;
}

interface MUCUser {
  jid?: string;          // 真实的ijd
  nick: string;         // occupant 的昵称
  affiliation: string;  // occupant 的身份
  role: string;         // occupant 的角色
}
```

`rooms` 以 **bare room JID**（如 `room@conference.example`）为键，追踪所有已加入房间的在线状态：

| 时机 | 行为 |
|------|------|
| 加入房间 | 自动创建条目 |
| 自身离开（收到 status 110 + type=unavailable）| 自动删除整个房间条目 |
| 收到其他用户的 unavailable presence | 自动从 `occupants` 中移除该用户 |
| `kick()` / `ban()` 成功 | 用户从 `occupants` 中移除 |

`occupants` 以 **完整 room JID**（如 `room@conference.example/nick`）为键，`MUCUser` 包含该 occupant 的角色、身份等信息。

### 静态常量（MUC 基类）

| 常量 | 值 | 说明 |
|------|-----|------|
| `NS.BASE` | `http://jabber.org/protocol/muc` | MUC 核心命名空间 |
| `NS.USER` | `http://jabber.org/protocol/muc#user` | 用户扩展命名空间 |
| `NS.ADMIN` | `http://jabber.org/protocol/muc#admin` | 管理 IQ 命名空间 |
| `NS.OWNER` | `http://jabber.org/protocol/muc#owner` | 所有者 IQ 命名空间 |
| `ROLE` | `["none", "visitor", "participant", "moderator"]` | 合法角色值 |
| `AFFILIATION` | `["none", "outcast", "member", "admin", "owner"]` | 合法身份值 |

## Stanza 字段扩展

**Presence** 节新增：

```typescript
interface Presence {
  muc?: {
    item?: MUCItem;        // jid / nick / affiliation / role / actor
    statuses?: string[];   // MUC 状态码列表
    destroy?: MUCDestroy;  // 房间被销毁时
  }
}
```

**Message** 节：若含 `muc#user`（如邀请），解析为 `{ muc: {} }`（空标记）。

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `muc:join` | 自身加入房间成功（status code 110，非 unavailable） | Presence |
| `muc:leave` | type='unavailable' 且含 muc item | Presence |
| `muc:groupchat` | type='groupchat' 且有 body | Message |
| `muc:subject` | type='groupchat' 有 subject 无 body | Message |
| `muc:kick` | status 码 307 | Presence |
| `muc:ban` | status 码 301 | Presence |
| `muc:destroy` | 房间被销毁 | Presence（含 destroy 信息） |

## API

| 方法 | 说明 |
|------|------|
| `join(room, nick, options?)` | 加入房间，options 支持密码/历史记录 |
| `leave(roomJid, reason?)` | 离开房间 |
| `sendGroupMessage(room, body)` | 发送群聊消息 |
| `setNick(room, newNick)` | 修改昵称 |
| `kick(room, nick, reason?)` | 踢出用户（需 moderator+） |
| `ban(room, jid, reason?)` | 封禁用户（需 admin+） |
| `setAffiliation(room, jid, aff, reason?)` | 修改用户身份 |
| `setRole(room, nick, role, reason?)` | 修改用户角色 |
| `getRoomConfig(room)` | 获取房间配置 DataForm |
| `setRoomConfig(room, form)` | 修改房间配置（需 owner） |

## 注意事项

- status 码 **110** = 自己的加入确认，101 = 成员身份发生变化
- 离开/踢人/封禁后 `rooms` 中的条目会被自动清除
- `sendGroupMessage()` 自动设置 `type='groupchat'`