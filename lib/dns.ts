import dns from 'dns/promises'; // 使用 promise 版本的 dns 模块
import type { SrvRecord } from 'dns'; // 导入 SrvRecord 类型
import logger from '@/log'; // 导入日志模块

const log = logger.getLogger('dns');
export interface EndpointInfo {
    host: string;
    port: number;
}

/** 按照 SRV 记录的优先级和权重排序 */
function sortBySrvPriority(records: SrvRecord[]): SrvRecord[] {
    return records.sort((a, b) => {
        // 首先按优先级排序（较低的优先级值优先）
        const priorityComparison = a.priority - b.priority;
        if (priorityComparison !== 0) {
            return priorityComparison;
        }
        // 在相同优先级内，按权重排序（较高的权重值优先）
        return b.weight - a.weight;
    });
}

/** 查询并排序 SRV 记录 */
export async function resolveXMPPSrv(domain: string, tls: boolean): Promise<EndpointInfo[]> {
    let hostname
    if (tls){
        hostname = `_xmpps-client._tcp.${domain}`;
    }else {
        hostname = `_xmpp-client._tcp.${domain}`;
    }
    try {
        const records = await dns.resolveSrv(hostname);
        // 按优先级和权重排序，然后转换为 EndpointInfo 数组
        return sortBySrvPriority(records).map(record => ({
            host: record.name,
            port: record.port
        }));
    } catch (error) {
        log.error(`Error resolving SRV records for ${domain}:`, error);
        throw error; // 重新抛出错误，让调用者处理
    }
}