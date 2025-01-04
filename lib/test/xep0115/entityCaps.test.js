import { it, describe, expect } from 'vitest';
import { EntityCaps } from '@/plugins/xep0115/entityCaps';
import { Form } from '@/plugins/xep0004/form';
import { Disco } from '@/plugins/xep0030/disco';
import { domParser } from '@/shims';

const formEl = domParser.parseFromString(`
    <x type="result" xmlns="jabber:x:data">
      <field var="FORM_TYPE" type="hidden">
        <value>http://jabber.org/network/serverinfo</value>
    </field>
        <field var="abuse-addresses" type="list-multi">
            <value>mailto:support@anoxinon.me</value>
    </field>
        <field var="support-addresses" type="list-multi">
            <value>mailto:support@anoxinon.me</value>
    </field>
        <field var="admin-addresses" type="list-multi">
            <value>mailto:support@anoxinon.me</value>
    </field>
    </x>`, 'text/xml').documentElement;
// @ts-expect-error
const { form } = Form.parseFormEl(formEl);
const discoEL = domParser.parseFromString(`
<query xmlns="http://jabber.org/protocol/disco#info">
    <identity type="pep" category="pubsub" />
    <identity name="ejabberd" type="im" category="server" />
    <feature var="http://jabber.org/protocol/commands" />
    <feature var="http://jabber.org/protocol/disco#info" />
    <feature var="http://jabber.org/protocol/disco#items" />
    <feature var="http://jabber.org/protocol/offline" />
    <feature var="http://jabber.org/protocol/pubsub" />
    <feature var="http://jabber.org/protocol/pubsub#access-authorize" />
    <feature var="http://jabber.org/protocol/pubsub#access-open" />
    <feature var="http://jabber.org/protocol/pubsub#access-presence" />
    <feature var="http://jabber.org/protocol/pubsub#access-whitelist" />
    <feature var="http://jabber.org/protocol/pubsub#auto-create" />
    <feature var="http://jabber.org/protocol/pubsub#auto-subscribe" />
    <feature var="http://jabber.org/protocol/pubsub#collections" />
    <feature var="http://jabber.org/protocol/pubsub#config-node" />
    <feature var="http://jabber.org/protocol/pubsub#config-node-max" />
    <feature var="http://jabber.org/protocol/pubsub#create-and-configure" />
    <feature var="http://jabber.org/protocol/pubsub#create-nodes" />
    <feature var="http://jabber.org/protocol/pubsub#delete-items" />
    <feature var="http://jabber.org/protocol/pubsub#delete-nodes" />
    <feature var="http://jabber.org/protocol/pubsub#filtered-notifications" />
    <feature var="http://jabber.org/protocol/pubsub#get-pending" />
    <feature var="http://jabber.org/protocol/pubsub#instant-nodes" />
    <feature var="http://jabber.org/protocol/pubsub#item-ids" />
    <feature var="http://jabber.org/protocol/pubsub#last-published" />
    <feature var="http://jabber.org/protocol/pubsub#manage-subscriptions" />
    <feature var="http://jabber.org/protocol/pubsub#member-affiliation" />
    <feature var="http://jabber.org/protocol/pubsub#modify-affiliations" />
    <feature var="http://jabber.org/protocol/pubsub#multi-items" />
    <feature var="http://jabber.org/protocol/pubsub#outcast-affiliation" />
    <feature var="http://jabber.org/protocol/pubsub#persistent-items" />
    <feature var="http://jabber.org/protocol/pubsub#presence-notifications" />
    <feature var="http://jabber.org/protocol/pubsub#presence-subscribe" />
    <feature var="http://jabber.org/protocol/pubsub#publish" />
    <feature var="http://jabber.org/protocol/pubsub#publish-only-affiliation" />
    <feature var="http://jabber.org/protocol/pubsub#publish-options" />
    <feature var="http://jabber.org/protocol/pubsub#publisher-affiliation" />
    <feature var="http://jabber.org/protocol/pubsub#purge-nodes" />
    <feature var="http://jabber.org/protocol/pubsub#retract-items" />
    <feature var="http://jabber.org/protocol/pubsub#retrieve-affiliations" />
    <feature var="http://jabber.org/protocol/pubsub#retrieve-default" />
    <feature var="http://jabber.org/protocol/pubsub#retrieve-items" />
    <feature var="http://jabber.org/protocol/pubsub#retrieve-subscriptions" />
    <feature var="http://jabber.org/protocol/pubsub#shim" />
    <feature var="http://jabber.org/protocol/pubsub#subscribe" />
    <feature var="http://jabber.org/protocol/pubsub#subscription-notifications" />
    <feature var="http://jabber.org/protocol/rsm" />
    <feature var="iq" />
    <feature var="jabber:iq:last" />
    <feature var="jabber:iq:privacy" />
    <feature var="jabber:iq:register" />
    <feature var="jabber:iq:version" />
    <feature var="msgoffline" />
    <feature var="presence" />
    <feature var="urn:xmpp:blocking" />
    <feature var="urn:xmpp:carbons:2" />
    <feature var="urn:xmpp:carbons:rules:0" />
    <feature var="urn:xmpp:extdisco:2" />
    <feature var="urn:xmpp:mam:0" />
    <feature var="urn:xmpp:mam:1" />
    <feature var="urn:xmpp:mam:2" />
    <feature var="urn:xmpp:mam:tmp" />
    <feature var="urn:xmpp:ping" />
    <feature var="urn:xmpp:sic:0" />
    <feature var="urn:xmpp:sic:1" />
    <feature var="vcard-temp" />
</query>
`, 'text/xml').documentElement;
// @ts-expect-error
const { identities, features } = Disco.parseDiscoInfo(discoEL);
it('测试EntityCaps', () => {
    EntityCaps.generateCapsVerification(identities, features, form).then(ver => {
        expect(ver).toBe('3pKvQXYo1Q0s0T5GhyI/ObDIhKM=');
    })
})
