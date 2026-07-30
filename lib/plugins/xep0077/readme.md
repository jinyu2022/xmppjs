# XEP-0077 — 带内注册

## 自动行为

**不通过 Connection 插件系统加载**。此插件是独立使用的注册工具，直接实例化 `new XEP0077()` 后调用。

## API

| 方法 | 说明 |
|------|------|
| `connectSocket(domain, protocol)` | 建立原始 socket 连接（支持 xmpps / ws） |
| `getRegistrationForm()` | 获取服务器注册表单 → `DataForm` |
| `register(form)` | 提交注册信息创建新账户 |
| `cancelRegistration()` | 取消当前注册流程 |

## 注意事项

- 此插件**不与 Connection 交互**，自行管理独立的 TLS/WS socket
- 支持 `xmpps`（直接 TLS 连接）和 `ws`（WebSocket）两种协议
- 注册表单如果服务器支持 XEP-0004，会返回结构化 DataForm
- 注册完成后 socket 会自动关闭
- 适用于账户注册场景，日常聊天不应使用此插件