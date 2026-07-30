import { describe, it, expect } from 'vitest';
import { XMPPElement } from '../../lib/ltx/Element';

describe('XMPPElement', () => {
  describe('createElement', () => {
    it('should create an element with a name', () => {
      const el = XMPPElement.createElement('message');
      expect(el.tagName).toBe('message');
      expect(el.childNodes).toEqual([]);
      expect(el.getAttribute('xmlns')).toBeNull();
    });
  });

  describe('createElementNS', () => {
    it('should create an element with namespace and qualified name', () => {
        const el = XMPPElement.createElementNS('http://example.com', 'ns:message');
        expect(el.tagName).toBe('ns:message');
        expect(el.namespaceURI).toBe('http://example.com');
        expect(el.prefix).toBe('ns');
        expect(el.localName).toBe('message');
    });
  });

  describe('localName', () => {
    it('should return name without prefix', () => {
      const el = XMPPElement.createElement('message');
      expect(el.localName).toBe('message');
    });

    it('should strip namespace prefix', () => {
      const el = XMPPElement.createElementNS('http://example.com', 'ns:message');
      expect(el.localName).toBe('message');
    });
  });

  describe('appendChild', () => {
    it('should append a child element', () => {
      const el = XMPPElement.createElement('message');
      const body = XMPPElement.createElement('body');
      const result = el.appendChild(body);
      
      expect(result).toBe(body);
      expect(body.parentNode).toBe(el);
      expect(el.childNodes[0]).toBe(body);
    });
  });

  describe('removeChild', () => {
    it('should remove a child element', () => {
      const el = XMPPElement.createElement('message');
      const body = XMPPElement.createElement('body');
      el.appendChild(body);
      
      const result = el.removeChild(body);
      expect(result).toBe(body);
      expect(body.parentNode).toBeNull();
      expect(el.childNodes).toEqual([]);
    });
  });

  describe('getChildren first match', () => {
    it('should get first matching child', () => {
      const el = XMPPElement.createElement('message');
      const body = XMPPElement.createElement('body');
      const thread = XMPPElement.createElement('thread');
      el.appendChild(body);
      el.appendChild(thread);
      
      expect(el.getChildren('body')[0]).toBe(body);
    });

    it('should return undefined if not found', () => {
      const el = XMPPElement.createElement('message');
      expect(el.getChildren('body')[0]).toBeUndefined();
    });
  });

  describe('getChildren', () => {
    it('should get all matching children', () => {
      const el = XMPPElement.createElement('message');
      const item1 = XMPPElement.createElement('item');
      const item2 = XMPPElement.createElement('item');
      const other = XMPPElement.createElement('other');
      el.appendChild(item1);
      el.appendChild(item2);
      el.appendChild(other);
      
      const items = el.getChildren('item');
      expect(items).toHaveLength(2);
      expect(items[0]).toBe(item1);
      expect(items[1]).toBe(item2);
    });
  });

  describe('getAttribute', () => {
    it('should get attribute value', () => {
      const el = XMPPElement.createElement('message');
      el.setAttribute('id', '123');
      expect(el.getAttribute('id')).toBe('123');
    });

    it('should return null for missing attribute', () => {
      const el = XMPPElement.createElement('message');
      expect(el.getAttribute('id')).toBeNull();
    });

    it('should safely handle names inherited by ordinary objects', () => {
      const el = XMPPElement.createElement('message');

      expect(el.getAttribute('constructor')).toBeNull();
      expect(el.getAttribute('toString')).toBeNull();
      expect(el.getAttribute('__proto__')).toBeNull();

      el.setAttribute('constructor', 'ctor');
      el.setAttribute('toString', 'stringifier');
      el.setAttribute('__proto__', 'prototype');

      expect(el.getAttribute('constructor')).toBe('ctor');
      expect(el.getAttribute('toString')).toBe('stringifier');
      expect(el.getAttribute('__proto__')).toBe('prototype');
    });
  });

  describe('setAttribute', () => {
    it('should set attribute and return this', () => {
      const el = XMPPElement.createElement('message');
      const result = el.setAttribute('id', '123');
      
      expect(result).toBe(el);
      expect(el.getAttribute('id')).toBe('123');
    });
  });

  describe('removeAttribute', () => {
    it('should remove attribute', () => {
      const el = XMPPElement.createElement('message');
      el.setAttribute('id', '123');
      el.setAttribute('type', 'chat');
      
      const result = el.removeAttribute('id');
      expect(result).toBe(el);
      expect(el.getAttribute('id')).toBeNull();
      expect(el.getAttribute('type')).toBe('chat');
    });
  });

  describe('textContent', () => {
    it('should return text content of children', () => {
        const el = XMPPElement.createElement('message');
        el.append('Hello', ' ', 'World');
        expect(el.textContent).toBe('Hello World');
    });

    it('should recursively collect descendant text content', () => {
        const el = XMPPElement.createElement('message');
        el.append('Hello');
        const b = XMPPElement.createElement('b');
        b.append('World');
        el.appendChild(b);
        expect(el.textContent).toBe('HelloWorld');
    });

    it.each(['', null])('should clear children when set to %s', (value) => {
      const el = XMPPElement.createElement('message');
      const child = XMPPElement.createElement('body');
      el.appendChild(child);

      el.textContent = value;

      expect(el.childNodes).toHaveLength(0);
      expect(child.parentNode).toBeNull();
      expect(el.toXMLString()).toBe('<message/>');
    });
  });

  describe('toXMLString', () => {
      it('should serialize simple element', () => {
          const el = XMPPElement.createElement('message');
          expect(el.toXMLString()).toBe('<message/>');
      });

      it('should serialize element with attributes', () => {
          const el = XMPPElement.createElement('message');
          el.setAttribute('to', 'user@example.com');
          expect(el.toXMLString()).toBe('<message to="user@example.com"/>');
      });

      it('should serialize element with text content', () => {
          const el = XMPPElement.createElement('message');
          el.append('Hello');
          expect(el.toXMLString()).toBe('<message>Hello</message>');
      });

      it('should serialize nested elements', () => {
          const el = XMPPElement.createElement('message');
          const body = XMPPElement.createElement('body');
          body.append('Hello');
          el.appendChild(body);
          expect(el.toXMLString()).toBe('<message><body>Hello</body></message>');
      });
      
      it('should serialize with indentation', () => {
        const el = XMPPElement.createElement('message');
        const body = XMPPElement.createElement('body');
        body.append('Hello');
        el.appendChild(body);
        
        const xml = el.toXMLString(2);
        // level 参数默认为 2，子节点缩进 = 2 * (level + 1) = 6 空格
        expect(xml).toBe('<message>\n      <body>Hello</body>\n    </message>');
      });
  });
  
  describe('appendChild reparent', () => {
    it('should move child from old parent', () => {
      const a = XMPPElement.createElement('a');
      const b = XMPPElement.createElement('b');
      const child = XMPPElement.createElement('child');
      a.appendChild(child);
      b.appendChild(child);
      expect(a.childNodes).toHaveLength(0);
      expect(b.childNodes[0]).toBe(child);
      expect(child.parentNode).toBe(b);
    });

    it('should reject inserting an element into itself', () => {
      const el = XMPPElement.createElement('message');

      expect(() => el.appendChild(el)).toThrowError(
        expect.objectContaining({ name: 'HierarchyRequestError' })
      );
      expect(el.parentNode).toBeNull();
      expect(el.childNodes).toHaveLength(0);
    });

    it('should reject inserting an ancestor into its descendant', () => {
      const root = XMPPElement.createElement('root');
      const child = XMPPElement.createElement('child');
      root.appendChild(child);

      expect(() => child.appendChild(root)).toThrowError(
        expect.objectContaining({ name: 'HierarchyRequestError' })
      );
      expect(root.parentNode).toBeNull();
      expect(child.parentNode).toBe(root);
    });
  });

  describe('removeChild throw', () => {
    it('should throw if not a child', () => {
      const el = XMPPElement.createElement('message');
      const body = XMPPElement.createElement('body');
      expect(() => el.removeChild(body)).toThrow(
        'The node to be removed is not a child of this node.'
      );
    });
  });

  describe('setAttributeNS', () => {
    it('should accept DOM-style 3 args', () => {
      const el = XMPPElement.createElement('message');
      el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', 'zh');
      expect(el.getAttribute('xml:lang')).toBe('zh');
    });
  });

  describe('getElementsByTagNameNS', () => {
    it('should support namespace wildcard and empty string', () => {
      const root = XMPPElement.createElementNS('urn:x', 'x:root');
      const item = XMPPElement.createElementNS('urn:x', 'x:item');
      root.appendChild(item);
      const plain = XMPPElement.createElement('item');
      root.appendChild(plain);

      expect(root.getElementsByTagNameNS('*', 'item')).toHaveLength(2);
      expect(root.getElementsByTagNameNS('urn:x', '*')).toHaveLength(1);
      expect(root.getElementsByTagNameNS('', 'item')).toContain(plain);
    });
  });

  describe('append', () => {
    it('should append multiple nodes', () => {
      const el = XMPPElement.createElement('message');
      const child1 = XMPPElement.createElement('child1');
      const child2 = XMPPElement.createElement('child2');
      
      el.append(child1, 'text', child2);
      
      expect(el.childNodes).toHaveLength(3);
      expect(el.childNodes[0]).toBe(child1);
      expect(el.childNodes[1]).toBe('text');
      expect(el.childNodes[2]).toBe(child2);
      
      expect(child1.parentNode).toBe(el);
      expect(child2.parentNode).toBe(el);
    });
  });

  describe('parentElement', () => {
    it('should return parent element', () => {
      const el = XMPPElement.createElement('message');
      const child = XMPPElement.createElement('child');
      el.appendChild(child);
      expect(child.parentElement).toBe(el);
    });
    
    it('should return null if no parent', () => {
      const el = XMPPElement.createElement('message');
      expect(el.parentElement).toBeNull();
    });

    it('should expose parentNode as a readonly getter', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        XMPPElement.prototype,
        'parentNode'
      );

      expect(descriptor?.get).toBeTypeOf('function');
      expect(descriptor?.set).toBeUndefined();
    });
  });

  describe('write', () => {
    it('should write to a function', () => {
      const el = XMPPElement.createElement('message');
      el.setAttribute('to', 'user');
      el.append('Hello');
      
      let output = '';
      el.write((chunk) => { output += chunk; });
      
      expect(output).toBe('<message to="user">Hello</message>');
    });
  });
});
