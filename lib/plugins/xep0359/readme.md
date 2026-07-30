# XEP-0359 — 唯一且稳定的节 ID

## 自动行为

加载此插件后，Connection 会自动：

1. **注册 disco 特性** — 向 XEP-0030 注册 `urn:xmpp:sid:0`

## Stanza 字段扩展

不直接扩展 stanza 接口。提供解析工具类识别三种 ID 元素：

| XML 元素 | 含义 |
|----------|------|
| `<stanza-id>` | 服务器分配的唯一稳定 ID（含 by 属性） |
| `<origin-id>` | 发送者分配的唯一稳定 ID |
| `<referenced-stanza>` | 引用的节 ID |

## API

| 方法 | 说明 |
|------|------|
| `StanzaID.parseStanzaId(xml)` | 解析 stanza-id/origin-id/referenced-stanza 元素 → `{ id, by? }` |

## 注意事项

- 不自动解析所有消息中的 stanza-id（需手动调用或注册）
- 主要用于消息撤回（XEP-0424/XEP-0425）等需要引用特定消息的场景
- stanza-id 中的 `by` 属性表示分配该 ID 的实体