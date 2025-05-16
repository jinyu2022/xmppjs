# XMPP.js 项目

## 项目简介
XMPP.js 是一个基于 XMPP 协议的即时通讯库，支持浏览器和 Node.js 环境。它提供了丰富的功能，包括用户认证、消息收发、群聊支持以及多种 XMPP 扩展协议（XEP）的实现。

## 功能特性
- **多环境支持**：兼容浏览器和 Node.js。
- **插件化设计**：支持通过插件扩展功能。
- **XMPP 协议支持**：实现了多种 XMPP 扩展协议（如 XEP-0077、XEP-0392 等）。
- **灵活的日志系统**：可配置日志级别，便于调试。

## 快速开始



### 配置

在 `index.ts` 中初始化客户端：
```typescript
import { Client } from './lib/client';

const client = new Client('username@domain', 'password', { protocol: 'xmpps' });
client.registerDefaultPlugins();
client.connect();
```

### 运行

使用以下命令启动项目：
```bash
npm run dev
```


## 文件结构

```
├── lib/                # 核心库文件
├── plugins/            # 插件目录
├── public/             # 静态资源
├── test/               # 测试用例
├── index.ts            # 项目入口
├── vite.config.ts      # Vite 配置文件
└── README.md           # 项目说明文件
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 感谢
感谢以下项目和库的支持：

- [XMPP.js](https://github.com/xmppjs/xmpp.js)
- [Strophe.js](https://github.com/strophe/strophejs)
- [slixmpp](https://codeberg.org/poezio/slixmpp)

## 许可证

本项目基于 [MPL License](./LICENSE) 开源。
