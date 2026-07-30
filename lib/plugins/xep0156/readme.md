# XEP-0156 — DNS 发现替代连接方式

## 自动行为

加载此插件后，Connection 会在 `init()` 时**自动**：

1. 检查是否已有 URL → 有则跳过
2. 检查协议是否为 ws/http → xmpp 协议跳过
3. 通过 `.well-known/host-meta` 获取 WebSocket/BOSH 端点
4. 自动设置 `connection.url`、`address`、`port`、`path`
5. 自动处理 TLS：ws → wss，http → https

## Stanza 字段扩展

无。

## 可监听事件

无额外事件。

## API

| 方法 | 说明 |
|------|------|
| `XMPPDiscoverer.discoverAltXMPP(domain, timeout?)` | 查询 DNS/well-known → `{ websocket?, xbosh?, httppoll? }` |

## 注意事项

- 仅在**未指定 URL 且协议不是 xmpp** 时触发
- 适用于需要通过 DNS 自动发现 WebSocket 地址的场景
- 超时默认 5000ms
- 发现失败会**抛出异常**（阻断连接）