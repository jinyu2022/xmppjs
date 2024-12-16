import { Connection } from '../connection';
import { expect, test } from 'vitest'

test('测试连接', async () => {
    const conn = new Connection("leke@suchat.org", "leke2020")
    conn.registerPlugin("XEP0030")
    conn.registerPlugin("XEP0156")
    conn.registerPlugin("XEP0280")

    conn.connect()
    
    conn.once("presence", (data) => {
        console.log("接受",data)
    })
    conn.once("message", (data) => {
        console.log("接受",data)
    })
    // 等待4秒
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve(true)
        }, 6000)
    })
    expect(conn).toBeTruthy()
    conn.disconnect()
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve(true)
        }, 100)
    })
}, 10000)