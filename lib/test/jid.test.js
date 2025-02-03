import { expect, test } from 'vitest'
import {JID} from '../JID.ts'

test('解析完整的jid', () => {
    const jid = new JID('user@domain/resource')
    expect(jid.local).toBe('user')
    expect(jid.domain).toBe('domain')
    expect(jid.resource).toBe('resource')
    expect(jid.full).toBe('user@domain/resource')
    expect(jid.bare).toBe('user@domain')
})

test('解析不带resource的jid', () => {
    const jid = new JID('user@domain')
    expect(jid.local).toBe('user')
    expect(jid.domain).toBe('domain')
    expect(jid.resource).toBe(void 0)
    expect(jid.full).toBe('user@domain/')
    expect(jid.bare).toBe('user@domain')
})

test('解析错误的jid', () => {
    expect(() => new JID('user/domain')).toThrow();
})