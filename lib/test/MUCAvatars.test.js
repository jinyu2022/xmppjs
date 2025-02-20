import { MUCAvatars } from '../plugins/xep0486/MUCAvatars';
import { xmlSerializer } from '../shims'
import { it, expect } from 'vitest';

it('should return the correct avatar', async () => {
    const avatars = await MUCAvatars.createSetAvatarIq('test@localhost', 'E:/git/jsjsj/xmppjs/lib/test/xep0084/xmpp.png');
    console.log(xmlSerializer.serializeToString(avatars));
})

it('should return the get avatar iq', async () => {
    const avatars = await MUCAvatars.createGetAvatarIq('test@localhost');
    console.log(xmlSerializer.serializeToString(avatars));
})
