import { expect, test } from 'vitest'
import {discoverAltXMPP} from '../plugins/xep0156/discoverAltXMPP'

test('获取hostmate', async () => {
    const host = await discoverAltXMPP('xmpp.jp')
    expect(host).toEqual({
        websocket: "wss://www.xmpp.jp/ws/",
        xbosh: "https://www.xmpp.jp/http-bind/",
    })
})