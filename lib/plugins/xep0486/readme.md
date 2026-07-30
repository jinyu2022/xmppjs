# XEP-0486 — MUC 房间头像

## 自动行为

加载此插件后，`init()` 为空，不会自动执行任何操作。所有功能需主动调用。

## Stanza 字段扩展

无。

## 可监听事件

无专门事件。

## API

| 方法 | 说明 |
|------|------|
| `setAvatar(roomJid, image?)` | 设置 MUC 房间头像（File 或路径），不传=删除 |
| `getAvatar(roomJid)` | 获取房间头像 → `{ binval: string, type }` |

### 返回值

```typescript
// getAvatar() 返回
{ binval: string, type: 'image/png' | 'image/jpeg' | 'image/gif' }
// binval 是 base64 编码的图片数据
```

## 注意事项

- 基于 **vCard PHOTO**（继承 XEP-0054 / XEP-0153）
- 设置和获取通过 IQ 操作
- 删除头像只需调用 `setAvatar()` 不传 image 参数
- 需要用户对房间有相应权限