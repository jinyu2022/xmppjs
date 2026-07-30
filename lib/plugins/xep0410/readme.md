# XEP-0410 — MUC 自 Ping（薛定谔的聊天）

## 自动行为

加载此插件后，Connection 在 `session:start` 时会**自动**：

1. **Ping 所有已加入房间** — 向每个房间的 `roomJid/nick` 发送 ping
2. **智能检测是否还在房间** — 分析 ping 结果，排除假阳性错误
3. **自动重加入** — 对确认已不在的房间自动重新加入

### 假阳性排除

以下错误不代表已离开房间，**不会触发重加入**：

| 错误条件 | 原因 |
|----------|------|
| `service-unavailable` | 目标未实现 ping |
| `feature-not-implemented` | 同上 |
| `item-not-found` | 刚改了昵称 |
| `remote-server-not-found` | S2S 问题 |
| `remote-server-timeout` | S2S 超时 |

## 可监听事件

无专门事件。重加入操作自动完成。

## API

| 方法 | 说明 |
|------|------|
| `pingAllJoinedRooms()` | 手动 ping 所有已加入房间 → 状态列表 |
| `rejoinRooms(roomJids[])` | 手动批量重加入 |
| `pingOccupant(occupantJid)` | Ping 单个房间成员 |

## 注意事项

- 依赖 **XEP-0045**（MUC）和 **XEP-0199**（Ping）
- 适用于**断线重连后**确认用户在房间中的状态
- 只有确认已离开的房间才会重加入
- 不需要手动调用，`session:start` 时自动执行