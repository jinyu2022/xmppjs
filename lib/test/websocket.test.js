import { expect, test } from 'vitest'
import  WebSocketClient  from '../transport/websocket.ts'
import {JID} from '../../lib/JID.ts';

test('测试ws连接', async () => {
    const ws = new WebSocketClient(new JID("leke@suchat.org"), "leke2020")
    ws.connect("wss://suchat.org:5443/ws")
    await new Promise((resolve) => {
        // ws.on('open', (e) => {
        //     console.log(e.data)
        // })
        ws.on('message', (e) => {
            console.log(e)
        })
        // 挂起30s
        setTimeout(() => {
            resolve(true)
        }, 4000)
    })
    expect(ws).toBeTruthy()
    ws.disconnect()
})