# XEP-0153 — vCard 头像（遗留方案）

## 自动行为

此模块不实现 Plugin 接口，不会被 Connection 自动加载。仅提供 `XEP0153` 类的静态方法。

## Stanza 字段扩展

不直接扩展（非 Plugin），但通过 `declare module` 声明了：

```typescript
// 在 stanza 模块中声明（但未被实际注册解析器）
interface Iq {
  vCard?: { photo?: VCardPhoto }
}
```

## API

| 方法 | 说明 |
|------|------|
| `createSetVCardAvatarIq(to, image?)` | 构造 vCard 头像设置 IQ（set），image 为 File/路径 |
| `createUpdatePresence(to, hash)` | 生成包含头像哈希的 presence 广播 XML 字符串 |
| `parseVCardAvatar(stanza)` | 从 XML 解析 vCard PHOTO → `{ binval: string, type }` |

## 注意事项

- 个人头像**应该用 XEP-0084**，此方案是遗留的
- 主要用于 MUC 房间等还使用 vCard 头像的场景
- `createSetVCardAvatarIq()` 不传 image 参数 = 删除头像
- 复用了 XEP-0084 的 `Avatar.imageParser()` 进行图片处理
- `createUpdatePresence()` 返回的是 **XML 字符串**，不是 XMPPElement