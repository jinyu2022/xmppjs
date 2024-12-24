import { describe, expect, test } from 'vitest'
import { Carbons } from '../plugins/xep0280/carbons'
import { Connection } from '../connection';
import { xmlSerializer } from '../shims'

describe('测试carbons', () => {
    const xml = xmlSerializer.serializeToString(Carbons.createEnableIq())
    test('测试构建enable iq', () => {
        expect(xml).toBe('<iq type="set" xmlns="jabber:client"><enable xmlns="urn:xmpp:carbons:2"/></iq>')
    })
})