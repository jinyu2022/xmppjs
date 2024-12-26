import { XMPPConnection } from '../transport/tcp';
import { JID } from '@/JID';
import { describe, it, expect } from 'vitest';

describe('XMPPConnection', async() => {
    it('应该能成功连接并发送流头', async () => {
        const connection = new XMPPConnection(new JID('weak@xmpp.jp'), 'crwin1966');
        connection.connect();
        // 存储接收到的数据
        let receivedData = '';
        
        // 监听事件
        const testPromise = new Promise((resolve, reject) => {
            connection.on('net', (data) => {
                console.log(`接受：${data}`, );
                // if (data.includes('success')) {
                //     receivedData += data;
                //     resolve(null);
                // }
            });
            
            
            connection.on('error', reject);
        });

        await testPromise;
        
        // 清理
        connection.disconnect();
    }, 5000);
});