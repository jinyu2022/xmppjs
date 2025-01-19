import dns from 'dns/promises'; // 使用 promise 版本的 dns 模块
import type { SrvRecord } from 'dns'; // 导入 SrvRecord 类型
import logger from '@/log'; // 导入日志模块

const log = logger.getLogger('dns');
export interface EndpointInfo {
    host: string;
    port: number;
}

class DoH {
    private static readonly DEFAULT_TIMEOUT = 2000;
    private static readonly API_URL = 'https://cloudflare-dns.com/dns-query';
    static async resolveSrv(hostname: string): Promise<EndpointInfo[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DoH.DEFAULT_TIMEOUT);

        try {
            const response = await fetch(`${this.API_URL}?name=${hostname}&type=SRV`, {
                headers: {
                    'accept': 'application/dns-json',
                },
                signal: controller.signal
            });

            const data = await response.json() as { Status: number, Answer?: { name: string, data: string; }[]; };

            if (data.Status === 0 && Array.isArray(data.Answer)) {
                const endpoints = data.Answer.map(record => {
                    const [priority, weight, port, target] = record.data.split(' ');
                    return {
                        priority: parseInt(priority, 10),
                        weight: parseInt(weight, 10),
                        port: parseInt(port, 10),
                        name: target
                    };
                });
                return sortBySrvPriority(endpoints).map(record => ({
                    host: record.name,
                    port: record.port
                }));;
            }

            throw new Error(`DNS query failed: ${data.Status}`);
        } catch (error) {
            log.error(`DoH query failed for ${hostname}:`, error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

/** 按照 SRV 记录的优先级和权重排序 */
function sortBySrvPriority(records: SrvRecord[]): SrvRecord[] {
    return records.sort((a, b) => {
        // 首先按优先级排序（较高的优先级值优先）
        const priorityComparison = b.priority - a.priority;
        if (priorityComparison !== 0) {
            return priorityComparison;
        }
        // 在相同优先级内，按权重排序（较高的权重值优先）
        return b.weight - a.weight;
    });
}

/**
 * 查询并排序 SRV 记录
 * @param domain 域名
 * @param xmpps 是否查询 xmpps
 * @returns 
 */
export async function resolveXMPPSrv(domain: string, xmpps: boolean): Promise<EndpointInfo[]> {
    log.debug(`Resolving SRV records for ${domain} (TLS: ${xmpps})`);
    let hostname;
    if (xmpps) {
        hostname = `_xmpps-client._tcp.${domain}`;
    } else {
        hostname = `_xmpp-client._tcp.${domain}`;
    }
    // try {
        const resolver = new dns.Resolver({ timeout: 1000, tries: 2 });
        const records = await resolver.resolveSrv(hostname);
        // 按优先级和权重排序，然后转换为 EndpointInfo 数组
        return sortBySrvPriority(records).map(record => ({
            host: record.name,
            port: record.port
        }));
    // }
    // catch (error) {
    //     log.error(`获取SRV记录失败，尝试DoH: ${domain}`, error);
    //     const endpoints = await DoH.resolveSrv(hostname);
    //     return endpoints;
    // }
}