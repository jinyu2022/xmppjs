import { describe, expect, test } from 'vitest'
import { xmlSerializer } from '../shims'
import { Disco } from '../plugins/xep0030/disco'
import Connection from '../connection'

describe('测试disco', () => {
    const connection = new Connection("leke@suchat.org", "leke2020")
    const disco = new Disco(connection)
    test('测试构建disco#info响应', () => {
        expect(disco).toBeTruthy()
        disco.addIdentity("client", "web", "leke", "zh")
        disco.addFeature("http://jabber.org/protocol/disco#info")
        disco.addFeature("http://jabber.org/protocol/disco#items")
        const discoInfo = disco.createInfoResult("test@leke.org", "123456")
        const xml = xmlSerializer.serializeToString(discoInfo)
        expect(xml).toBe(`<iq type="result" to="test@leke.org" id="123456" xmlns="jabber:client"><query xmlns="http://jabber.org/protocol/disco#info"><identity category="client" type="web" name="leke" xml:lang="zh"/><feature var="http://jabber.org/protocol/disco#info"/><feature var="http://jabber.org/protocol/disco#items"/></query></iq>`)
    })
    test('测试构建disco#items响应', () => {
        disco.addItem("test.leke.com", "测试", "测试项目")
        const discoItems = disco.createItemsResult("test@leke.org", "123456")
        const xml = xmlSerializer.serializeToString(discoItems)
        console.log(xml)
        expect(xml).toBe(`<iq type="result" to="test@leke.org" id="123456" xmlns="jabber:client"><query xmlns="http://jabber.org/protocol/disco#items"><item jid="test.leke.com" name="测试" node="测试项目"/></query></iq>`)
    })
})