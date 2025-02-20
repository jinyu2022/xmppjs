export interface Transport {
    /** 发送数据 */
    send(data: string): void;
    /** 关闭连接 */
    close(): void;
    /** 连接状态 */
    status: "open" | "close" | "error";
}
export const enum Status {
    /** 客户端未连接 */
    DISCONNECTED = 0,
    /** 正在连接到服务器 */
    CONNECTING = 1,
    /** 已成功连接到服务器 */
    CONNECTED = 2,
    /** 正在建立xmpp流 */
    STREAM_START = 3,
    /** xmpp流建立成功 */
    STREAM_ESTABLISHED = 4,
    /** 正在进行身份验证 */
    AUTHENTICATING = 5,
    /** 身份验证成功 */
    AUTHENTICATED = 6,
    /** 正在进行资源绑定 */
    BINDING = 7,
    /** 资源绑定成功 */
    BINDED = 8,
    /** 身份验证失败 */
    AUTHFAIL = 9,
    /** 会话已开始 */
    SESSIONSTART = 10,
    /** 正在重新连接 */
    RECONNECTING = 11,
    /** 已重新连接 */
    DISCONNECTING = 40,
    /** 发生错误 */
    ERROR = 41,
    /** 操作超时 */
    TIMEOUT = 42,
    /** 会话结束 */
    SESSIONEND = 43,
}

export interface SaslData {
    mechanism?: "PLAIN" | "SCRAM-SHA-1";
    clientFirstMessageBare?: string;
    authMessage?: string;
    serverProof?: string;
}