import { XEP0392 } from '../../plugins/xep0392/index';
import { it, expect } from 'vitest'

it('colorize', async () => {
    const text = 'qazwe@conversations.im';
    const color = await XEP0392.colorize(text);
    console.log(color);
    expect(color).toBe('#d700c2');
});