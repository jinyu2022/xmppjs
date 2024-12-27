import { Connection } from '../connection';
import { expect, it } from 'vitest'
import logger from 'loglevel';

it('测试连接', async () => {
    logger.setLevel("debug")
    // 必须要重新构建一下，不然等级不会生效
    logger.rebuild()
    const conn = new Connection("leke@suchat.org", "leke2020", {protocol: "xmpp"})
    conn.registerPlugin("RFC6121")
    conn.registerPlugin("XEP0030")
    conn.registerPlugin('XEP0045')
    conn.registerPlugin("XEP0156")
    conn.registerPlugin("XEP0199")
    conn.registerPlugin("XEP0280")

    conn.connect()

    conn.once("presence", (data) => {
        logger.info("接受", data)
    })
    conn.once("message", (data) => {
        logger.debug("接受", data)
    })
    conn.on('session:start', async () => {
        // conn.XEP0045?.join('gbudn19@conference.conversations.im', '4444445555',{
        //     'maxchars': 0,
        // })
        const roster = await conn.getRoster()
        // 发个ping
        conn.XEP0199?.ping(conn.jid.domain).then((data) => {
            logger.info('PING', data)
        })
        // console.log('ROSTER', roster)
    })
    // 等待4秒
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve(true)
        }, 6000)
    })
    expect(conn).toBeTruthy()
    // conn.disconnect()
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve(true)
        }, 100)
    })
}, 10000)