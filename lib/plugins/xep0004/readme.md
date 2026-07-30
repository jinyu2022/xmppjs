# XEP-0004 — 数据表单

## 自动行为

此插件是**纯工具类**，加载后不注册任何事件或拦截器。`init()` 为空实现。

只将 `Form` 类的静态方法作为插件暴露，供其他插件在 stanza 解析中调用。

## Stanza 字段扩展

不直接扩展任何 stanza 接口。其他 XEP（如 XEP-0077、XEP-0128）会在自己的 stanza 解析中调用 `Form.parseFormEl()`，并将结果挂到对应的 stanza 字段上。

## API

| 方法 | 说明 |
|------|------|
| `Form.parseFormEl(xml)` | 解析 `<x xmlns='jabber:x:data'>` → `{ form: DataForm }` |
| `Form.createFormEl(data)` | 从 `DataForm` 生成 `<x>` 元素 |

### DataForm 结构

```typescript
interface DataForm {
  type: 'cancel' | 'form' | 'result' | 'submit';
  title?: string;
  instructions?: string;
  fields: Field[];
  reported?: Field[];
  items?: { fields: Field[] }[];
}
interface Field {
  type?: FieldType;  // boolean / hidden / list-single / text-single 等
  var?: string;
  label?: string;
  values: string[];
  options?: Option[];  // 仅 list-single / list-multi
}
```

## 注意事项

- 基础组件，大多数需要表单处理的 XEP 都依赖它
- 只负责 XML ↔ 对象的双向转换，不执行网络操作
- 其他插件通过 `new XEP0004(connection)` 实例化，但通常不需要直接使用