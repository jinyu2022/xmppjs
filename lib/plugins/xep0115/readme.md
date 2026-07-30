# XEP-0115 — 实体能力

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 caps 解析器** — 自动解析 presence 中 `http://jabber.org/protocol/caps` 命名空间的 `<c>` 元素
2. **监听 presence** — 监听 presence 节来解析其他实体的能力信息（TODO）
3. **生成自身能力哈希** — 在 `connect` 事件后，基于 XEP-0030 的 identities 和 features 生成 SHA-1 哈希

## Stanza 字段扩展

加载后，**Presence** 节新增：

```typescript
interface Presence {
  cap?: {           // 注意: 字段名是 cap 不是 caps
    node: string;
    ver: string;    // capabilities 验证哈希
    hash: string;   // 哈希算法（如 'sha-1'）
  }
}
```

## API

| 方法 | 说明 |
|------|------|
| `EntityCaps.generateCapsVerification(ids, features, form?)` | 生成能力验证字符串（SHA-1 Base64） |
| `EntityCaps.createCapsElement(caps)` | 创建 `<c>` 元素 |

## 注意事项

- 自身能力哈希在 `connect` 事件时生成，使用 XEP-0030 的 identities/features
- 默认 node 为 `http://lekexmpp.chat`
- 能力匹配文件（ver → capabilities 映射）尚未实现（TODO）
- 不依赖于 presence 发送拦截器（已被注释掉），需自行在 presence 中附加 caps 元素