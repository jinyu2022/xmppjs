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
})