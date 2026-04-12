import { describe, it, expect } from 'vitest';
import { XMPPElement } from '../../lib/ltx/Element';

describe('XMPPElement', () => {
  describe('createElement', () => {
    it('should create an element with a name', () => {
      const el = XMPPElement.createElement('message');
      expect(el.tagName).toBe('message');
      expect(el.childNodes).toEqual([]);
      expect(el.getAttribute('xmlns')).toBeUndefined();
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

  describe('getChild', () => {
    it('should get first matching child', () => {
      const el = XMPPElement.createElement('message');
      const body = XMPPElement.createElement('body');
      const thread = XMPPElement.createElement('thread');
      el.appendChild(body);
      el.appendChild(thread);
      
      expect(el.getChild('body')).toBe(body);
    });

    it('should return undefined if not found', () => {
      const el = XMPPElement.createElement('message');
      expect(el.getChild('body')).toBeUndefined();
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

    it('should return undefined for missing attribute', () => {
      const el = XMPPElement.createElement('message');
      expect(el.getAttribute('id')).toBeUndefined();
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
      expect(el.getAttribute('id')).toBeUndefined();
      expect(el.getAttribute('type')).toBe('chat');
    });
  });

  describe('textContent', () => {
    it('should return text content of children', () => {
        const el = XMPPElement.createElement('message');
        el.append('Hello', ' ', 'World');
        console.log(el);
        expect(el.textContent).toBe('Hello World');
    });

    it('should ignore element children in textContent', () => {
        const el = XMPPElement.createElement('message');
        el.append('Hello');
        el.appendChild(XMPPElement.createElement('br'));
        el.append('World');
        expect(el.textContent).toBe('HelloWorld');
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
        expect(xml).toBe('<message>\n  <body>Hello</body>\n</message>');
      });
  });
  
  describe('ownerDocument', () => {
      it('should return self if no parent', () => {
          const el = XMPPElement.createElement('message');
          expect(el.ownerDocument).toBe(el);
      });

      it('should return root element', () => {
          const root = XMPPElement.createElement('root');
          const child = XMPPElement.createElement('child');
          const grandChild = XMPPElement.createElement('grandChild');
          
          root.appendChild(child);
          child.appendChild(grandChild);
          
          expect(grandChild.ownerDocument).toBe(root);
          expect(child.ownerDocument).toBe(root);
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
