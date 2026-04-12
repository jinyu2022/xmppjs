import { describe, it, expect } from 'vitest';
import { XMPPElement } from '../../../lib/ltx/Element';
import { Pubsub } from '../../../lib/plugins/xep0060/pubsub';

function createItemsEventXml(node, itemId, payloadTagName = 'entry') {
  const event = XMPPElement.createElementNS(Pubsub.NS.EVENT, 'event');
  const items = XMPPElement.createElement('items');
  items.setAttribute('node', node);
  const item = XMPPElement.createElement('item');
  if (itemId) item.setAttribute('id', itemId);
  const payload = XMPPElement.createElement(payloadTagName);
  payload.textContent = 'payload-content';
  item.appendChild(payload);
  items.appendChild(item);
  event.appendChild(items);
  return event;
}

describe('Pubsub (XEP-0060)', () => {
  it('parses items event', () => {
    const ev = createItemsEventXml('princely_musings', 'ae890ac52');
    const result = Pubsub.parseEventEl(ev);
    expect(result).toBeDefined();
    expect(result.event).toBeDefined();
    const e = result.event;
    expect(e.node).toBe('princely_musings');
    expect(e.item).toBeDefined();
    expect(e.item.id).toBe('ae890ac52');
  });

  it('createRetrieveItemsIq sets max_items and node', () => {
    const iq = Pubsub.createRetrieveItemsIq('pubsub.example.org', 'princely_musings', 2);
    expect(iq.tagName).toBe('iq');
    const pubsubEl = iq.getElementsByTagName('pubsub')[0];
    expect(pubsubEl.namespaceURI).toBe(Pubsub.NS.BASE);
    const itemsEl = pubsubEl.getElementsByTagName('items')[0];
    expect(itemsEl.getAttribute('node')).toBe('princely_musings');
    expect(itemsEl.getAttribute('max_items')).toBe('2');
  });

  it('createPublishIq wraps publish element into pubsub', () => {
    const publish = XMPPElement.createElement('publish');
    publish.setAttribute('node', 'princely_musings');
    const item = XMPPElement.createElement('item');
    item.setAttribute('id', 'myitem');
    const entry = XMPPElement.createElement('entry');
    entry.textContent = 'hello';
    item.appendChild(entry);
    publish.appendChild(item);

    const iq = Pubsub.createPublishIq(publish);
    expect(iq.tagName).toBe('iq');
    const pubsubEl = iq.getElementsByTagName('pubsub')[0];
    expect(pubsubEl.namespaceURI).toBe(Pubsub.NS.BASE);
    const publishEl = pubsubEl.getElementsByTagName('publish')[0];
    expect(publishEl.getAttribute('node')).toBe('princely_musings');
  });

  it('createRetractIq builds retract with notify and item', () => {
    const iq = Pubsub.createRetractIq('princely_musings', 'myitem', true);
    expect(iq.tagName).toBe('iq');
    const pubsubEl = iq.getElementsByTagName('pubsub')[0];
    const retract = pubsubEl.getElementsByTagName('retract')[0];
    expect(retract.getAttribute('node')).toBe('princely_musings');
    expect(retract.getAttribute('notify')).toBe('true');
    const item = retract.getElementsByTagName('item')[0];
    expect(item.getAttribute('id')).toBe('myitem');
  });
});
