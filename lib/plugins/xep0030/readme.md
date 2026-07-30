# XEP-0030 — 服务发现

## 自动行为

加载此插件后，Connection 会自动：

1. **自注册 Disco 特性** — 在自身 `features` 中添加 `disco#info` 和 `disco#items`
2. **自动发现服务器** — 在 `session:start` 时，自动向服务器域名发送 disco#info 查询
3. **触发事件** — 获取成功后触发 `serverDiscovered` 事件，失败打印 warn
4. **响应 disco 查询** — 监听 `type='get'` 的 IQ，自动回复 disco#info / disco#items 的 result IQ

## Stanza 字段扩展

不直接扩展 stanza 接口。disco 信息以返回值形式提供。

## 可监听事件

| 事件 | 触发时机 | 说明 |
|------|---------|------|
| `serverDiscovered` | 服务器 disco 信息获取完成 | 可开始使用依赖服务器特性的插件 |

## API

| 方法 | 说明 |
|------|------|
| `getDiscoInfo(jid, bypassCache?)` | 查询实体身份/特性/扩展表单 |
| `getDiscoItems(jid, bypassCache?)` | 查询实体子项目列表 |
| `getServerFeatures()` | 获取服务器特性 Set（Promise） |
| `getServerIdentities()` | 获取服务器身份列表（Promise） |
| `addFeature(ns)` | 添加自身特性（供其他插件注册） |
| `addIdentity(cat, type, name, lang)` | 添加自身身份 |
| `addItem(jid, node?, name?)` | 添加 disco 子项（如 PEP 节点） |

### getDiscoInfo 返回值

```typescript
{
  identities: Identity[];     // { category, type, name?, lang? }
  features: Set<string>;      // 支持的特性 namespace
  extensions?: DataForm;      // XEP-0128 扩展表单
}
```

## 注意事项

- 内置 info/items 缓存，TTL **300 秒**（硬编码），过期自动重查
- `addFeature()` 有重复 warn，不阻止重复；`addIdentity()` 严格冲突检
- 其他插件通过 `connection.XEP0030` 访问实例