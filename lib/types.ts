export interface Options {
  protocol?: Protocol;
  host?: string;
  port?: string;
  path?: string;
  tls?: boolean;
  /** 是否启用重连 */
  reconnect?: boolean;
  /** 最大重连间隔 */
  reconnectMaxInterval?: number;
  /** 最大重连次数 */
  reconnectMaxAttempts?: number;
}
export type Protocol = "ws" | "http" | "xmpp";
