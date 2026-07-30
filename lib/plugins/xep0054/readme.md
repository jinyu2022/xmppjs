# XEP-0054 — vCard-Temp

## 概述

**已废弃**（被 XEP-0292 取代），仅保留类型定义供其他插件引用。

## 自动行为

无。此模块不实现 Plugin 接口，不会被 Connection 自动加载。仅提供 `VCardTemp.NS = 'vcard-temp'` 命名空间常量和 TypeScript 类型定义。

## Stanza 字段扩展

不扩展 stanza。仅导出接口：`VCard`、`Tel`、`Adr`、`Email`。

## 被引用方

- **XEP-0153** — vCard 头像（使用 `VCardTemp.NS` 命名空间）
- **XEP-0486** — MUC 头像（基于 vCard PHOTO）

## 注意事项

- 个人头像应使用 **XEP-0084**，不要使用此模块
- 此模块仅存在于代码中供 MUC 相关场景复用的 vCard 基础类型