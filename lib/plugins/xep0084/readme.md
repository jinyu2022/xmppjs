# XEP-0084 — 用户头像

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 子项** — 向 XEP-0030 注册 `urn:xmpp:avatar:metadata` 和 `urn:xmpp:avatar:data` 节点
2. **注册 metadata 解析器** — 自动解析命名空间 `urn:xmpp:avatar:metadata` 的 stanza
3. **注册 `pep:avatar` 事件** — 监听 PEP 头像更新通知

## Stanza 字段扩展

不直接扩展 stanza 接口（metadata 解析由 `connection.registerStanzaPlugin` 注册）。

## 可监听事件

| 事件 | 触发条件 | 回调参数 |
|------|---------|----------|
| `pep:avatar` | 收到头像元数据更新的 PEP 通知 | Message（含 `event.node === metadata`） |

## API

| 方法 | 说明 |
|------|------|
| `getAvatarData(jid, metadata?)` | 获取用户头像数据 → `AvatarMetadata & { data?: string }` |
| `publishAvatar(image, options?)` | 发布自己的头像（接受 File 或路径） |
| `deleteAvatar()` | 删除自己的头像 |

### AvatarMetadata

```typescript
interface AvatarMetadata {
  id: string;      // SHA-1 哈希
  type: string;    // MIME 类型
  bytes: number;   // 文件大小
  width?: number;
  height?: number;
}
```

## 注意事项

- 发布头像仅支持 **PNG** 格式（规范要求）
- `getAvatarData()` 返回的 `data` 是 base64 编码的图片数据
- 头像变更通过 `pep:avatar` 事件接收，需自行处理 UI 更新
- Node.js 和浏览器环境均支持（自动检测运行时）