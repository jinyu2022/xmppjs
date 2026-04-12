import { resolveSrv } from 'dns';
import { connect } from 'tls';

/**
 * 目标XMPP域名
 * @type {string}
 */
const DOMAIN = 'conversations.im';

/**
 * 默认XMPP客户端端口
 * @type {number}
 */
const DEFAULT_PORT = 5223; // 更改为传统的直接TLS端口 5223

/**
 * 执行SRV记录查找并建立TLS连接
 */
function testXmppTlsConnection() {
    /**
     * SRV记录名称，用于查找XMPP客户端服务。
     * 使用 '_xmpps-client._tcp' 查找传统的直接 TLS 连接端口 (通常是 5223)。
     * @type {string}
     */
    const srvRecord = `_xmpps-client._tcp.${DOMAIN}`;

    console.log(`正在查找 ${DOMAIN} 的 XMPP 直接 TLS SRV 记录: ${srvRecord}`);

    resolveSrv(srvRecord, (err, addresses) => {
        let host = DOMAIN;
        let port = DEFAULT_PORT;

        if (err) {
            console.error(`SRV 查找失败 (${err.code}). 使用默认设置: ${host}:${port}`);
        } else if (addresses && addresses.length > 0) {
            // 按照优先级和权重排序，选择最佳目标
            addresses.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return b.weight - a.weight;
            });

            /**
             * 选定的目标地址 (主机名和端口)
             * @type {dns.SrvRecord}
             */
            const target = addresses[0];
            host = target.name;
            port = target.port;
            console.log(`SRV 查找成功. 连接到: ${host}:${port}`);
        } else {
            console.log(`未找到 SRV 记录. 使用默认设置: ${host}:${port}`);
        }

        // 建立 TLS 连接
        connectTls(host, port, host);
    });
}

/**
 * 建立到指定主机和端口的TLS连接
 * @param {string} host - 目标主机名
 * @param {number} port - 目标端口
 * @param {string} servername - 用于SNI的服务器名称 (通常是原始域名)
 */
function connectTls(host, port, servername) {
    /**
     * 连接超时计时器
     * @type {NodeJS.Timeout | null}
     */
    let connectionTimeout = null;

    /**
     * TLS连接选项配置
     * @type {tls.ConnectionOptions}
     */
    const options = {
        host: host,
        port: port,
        // 必须设置 servername 以确保正确的证书验证和SNI握手
        servername: servername,
        // 注意: 生产环境中应设置为 true，这里为了测试方便可能暂时禁用证书验证
        rejectUnauthorized: false,
        // 显式设置最低 TLS 版本为 1.2，以提高兼容性
        minVersion: 'TLSv1.2' 
    };

    console.log(`尝试建立 TLS 连接到 ${options.host}:${options.port} (SNI: ${options.servername})`);

    /**
     * TLS Socket 实例
     * @type {tls.TLSSocket}
     */
    const socket = connect(options, () => {
        console.log('TLS 连接建立成功.');
        console.log('TLS 握手状态:', socket.authorized ? '授权' : '未授权');
        
        // XMPP 连接建立后，通常需要发送 <stream:stream> 标签来启动会话。
        /**
         * 初始XMPP流头部，用于启动XMPP会话
         * @type {string}
         */
        const streamHeader = `<?xml version='1.0'?><stream:stream to='conversations.im' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>`;
        
        console.log('发送 XMPP 流头部...');
        socket.write(streamHeader);

        // 设置一个短时间超时，以防服务器无响应
        resetTimeout();
    });

    /**
     * 重置连接超时计时器
     */
    function resetTimeout() {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }
        connectionTimeout = setTimeout(() => {
            console.log('连接超时 (5秒无活动). 强制关闭连接.');
            if (!socket.destroyed) {
                socket.destroy();
            }
        }, 5000); // 5秒超时
    }

    socket.on('data', (data) => {
        resetTimeout(); // 收到数据，重置超时
        console.log('接收到数据:');
        // 打印接收到的数据，并转换为字符串
        console.log(data.toString());
        
        // 移除 socket.end()，允许接收完整的服务器响应
    });

    socket.on('error', (err) => {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }
        console.error('连接错误:', err.message);
        // ETIMEDOUT 是连接超时错误，通常是网络或防火墙问题。
        // 确保在发生错误时销毁 socket 以清理资源。
        if (!socket.destroyed) {
            socket.destroy();
        }
    });

    socket.on('close', () => {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }
        console.log('连接已关闭.');
    });
}

// 运行测试
testXmppTlsConnection();
