import { describe, expect, test } from 'vitest'
import { Carbons } from '../plugins/xep0280/carbons'
import { Connection } from '../connection';
import { xmlSerializer } from '../shims'

describe('测试carbons', () => {
    const connection = new Connection("test@test.com", "test")
    const carbons = new Carbons(connection)
    const xml = xmlSerializer.serializeToString(carbons.createEnableIq())
    test('测试构建enable iq', () => {
        expect(xml).toBe('<iq type="set" xmlns="jabber:client"><enable xmlns="urn:xmpp:carbons:2"/></iq>')
    })
    test('测试构建disco#info iq', () => {
        const discoInfo = connection.XEP0030?.createInfoResult("test@leke.org", "123456")
        if (!discoInfo) throw new Error("discoInfo is null")
        const xml = xmlSerializer.serializeToString(discoInfo)
        expect(xml).toBe('<iq type="result" to="test@leke.org" id="123456" xmlns="jabber:client"><query xmlns="http://jabber.org/protocol/disco#info"><feature var="http://jabber.org/protocol/disco#info"/><feature var="http://jabber.org/protocol/disco#items"/><feature var="urn:xmpp:carbons:2"/></query></iq>')
    })
})