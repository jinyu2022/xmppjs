import { describe, expect, test } from 'vitest'
import { xmlSerializer, domParser } from '../shims'
import { Disco } from '../plugins/xep0030/disco'
import Connection from '../connection'

describe('测试disco', () => {
    const connection = new Connection("leke@suchat.org", "leke2020")
    test('测试构建disco#info响应', () => {
        Disco.addIdentity("client", "web", "leke", "zh")
        Disco.addFeature("http://jabber.org/protocol/disco#info")
        Disco.addFeature("http://jabber.org/protocol/disco#items")
        const discoInfo = Disco.createInfoResult("test@leke.org", "123456")
        const xml = xmlSerializer.serializeToString(discoInfo)
        expect(xml).toBe(`<iq type="result" to="test@leke.org" id="123456" xmlns="jabber:client"><query xmlns="http://jabber.org/protocol/disco#info"><identity category="client" type="web" name="leke" xml:lang="zh"/><feature var="http://jabber.org/protocol/disco#info"/><feature var="http://jabber.org/protocol/disco#items"/></query></iq>`)
    })
    test('测试构建disco#items响应', () => {
        Disco.addItem("test.leke.com", "测试", "测试项目")
        const discoItems = Disco.createItemsResult("test@leke.org", "123456")
        const xml = xmlSerializer.serializeToString(discoItems)
        console.log(xml)
        expect(xml).toBe(`<iq type="result" to="test@leke.org" id="123456" xmlns="jabber:client"><query xmlns="http://jabber.org/protocol/disco#items"><item jid="test.leke.com" name="测试项目" node="测试"/></query></iq>`)
    })
    test('测试解析disco#info', () => {
        const discoInfo = `<iq xmlns="jabber:client" xml:lang="en" to="kevinxu@anoxinon.me/gajim.30E2VSM7" from="ifixo@conference.conversations.im" type="result" id="757041f8-6609-44b3-8d3b-9872306fcda8">
  <query xmlns="http://jabber.org/protocol/disco#info">
    <identity name="教学" type="text" category="conference" />
    <feature var="vcard-temp" />
    <feature var="http://jabber.org/protocol/muc" />
    <feature var="http://jabber.org/protocol/disco#info" />
    <feature var="http://jabber.org/protocol/disco#items" />
    <feature var="http://jabber.org/protocol/commands" />
    <feature var="urn:xmpp:message-moderate:0" />
    <feature var="urn:xmpp:message-moderate:1" />
    <feature var="urn:xmpp:message-retract:1" />
    <feature var="muc_hidden" />
    <feature var="muc_persistent" />
    <feature var="muc_open" />
    <feature var="muc_nonanonymous" />
    <feature var="muc_moderated" />
    <feature var="muc_unsecured" />
    <feature var="jabber:iq:register" />
    <feature var="urn:xmpp:occupant-id:0" />
    <feature var="urn:xmpp:mam:tmp" />
    <feature var="urn:xmpp:mam:0" />
    <feature var="urn:xmpp:mam:1" />
    <feature var="urn:xmpp:mam:2" />
    <feature var="urn:xmpp:sid:0" />
    <x xmlns="jabber:x:data" type="result">
      <field var="FORM_TYPE" type="hidden">
        <value>http://jabber.org/protocol/muc#roominfo</value>
</field>
      <field var="muc#roominfo_avatarhash" type="text-multi" label="Hash of the vCard-temp avatar of this room">
        <value>4b4893f97542347ef3ac1d46aa84c9bea1b10405</value>
</field>
      <field var="muc#roominfo_occupants" type="text-single" label="Number of occupants">
        <value>3</value>
</field>
      <field var="muc#roomconfig_roomname" type="text-single" label="Natural-Language Room Name">
        <value>教学</value>
</field>
      <field var="muc#roominfo_description" type="text-single" label="Room description" />
      <field var="muc#roomconfig_changesubject" type="boolean" label="Occupants May Change the Subject">
        <value>1</value>
</field>
      <field var="muc#roomconfig_allowinvites" type="boolean" label="Occupants are allowed to invite others">
        <value>1</value>
</field>
      <field var="muc#roomconfig_allow_query_users" type="boolean" label="Occupants are allowed to query others">
        <value>1</value>
</field>
      <field var="muc#roomconfig_allowpm" type="list-single" label="Roles that May Send Private Messages">
        <value>anyone</value>
        <option label="Anyone">
          <value>anyone</value>
</option>
        <option label="Anyone with Voice">
          <value>participants</value>
</option>
        <option label="Moderators Only">
          <value>moderators</value>
</option>
        <option label="Nobody">
          <value>none</value>
</option>
</field>
      <field var="muc#roominfo_lang" type="text-single" label="Natural Language for Room Discussions">
        <value />
</field>
</x>
</query>
</iq>
`
        const doc = domParser.parseFromString(discoInfo, 'text/xml')
        const result = Disco.parseDiscoInfo(doc.documentElement)
        console.log(result)
        console.log(result.extensions)
    })

})