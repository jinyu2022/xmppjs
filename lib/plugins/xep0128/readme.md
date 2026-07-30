# XEP-0128 — 服务发现扩展

## 自动行为

纯工具类，不实现 Plugin 接口。由 **XEP-0030 的 `Disco.parseDiscoInfo()`** 在解析 disco 响应时内部调用。

## Stanza 字段扩展

不直接扩展 stanza。XEP-0030 的 `getDiscoInfo()` 返回值的 `extensions` 字段来自 XEP-0128 解析结果。

## API

| 方法 | 说明 |
|------|------|
| `XEP0128.parseDataForm(xml)` | 从 disco#info 的 `<query>` 中解析 XEP-0004 扩展表单 → `{ form?: DataForm }` |

## 注意事项

- **无需单独导入** — 已集成在 XEP-0030 中
- 如果 disco 响应中没有扩展表单，返回 `{ form: undefined }`