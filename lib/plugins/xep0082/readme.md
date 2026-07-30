# XEP-0082 — 日期/时间格式化

## 自动行为

纯工具类，不实现 Plugin 接口，不会被自动加载。其他模块直接 `import { XMPPDateTime }` 使用。

## API

| 方法 | 说明 | 输出格式 |
|------|------|---------|
| `formatDate(date)` | 日期 | `2024-09-17` |
| `formatDateTime(date, ms?, tz?)` | 完整日期时间 | `2024-09-17T14:30:45Z` |
| `formatTime(date, ms?, tz?)` | 仅时间 | `14:30:45Z` |
| `parseDateTime(str)` | 解析 ISO 8601 字符串 | `Date` |

### 参数

- `ms` — 是否含毫秒（默认 false），输出 `.sss`
- `tz` — 时区：`'Z'`（默认）或 `'+08:00'` / `'-05:00'`

## 注意事项

- 所有输出遵循 ISO 8601 / XMPP Date/Time Profiles
- 被 XEP-0203（延迟投递）和 XEP-0424（消息撤回）使用