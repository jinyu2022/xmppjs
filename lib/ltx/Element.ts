import { escapeXML, escapeXMLText } from "./escape.js";
/** DOM-inspired：文本节点用 string，元素节点用 XMPPElement */
export type Node = XMPPElement | string;

/**
 * 只读元素集合，类似 HTMLCollection 的简化版（非 live）。
 */
export class XMPPElementCollection implements Iterable<XMPPElement> {
  private readonly elements: XMPPElement[];

  /**
   * @param elements 内部存储的 XMPPElement 数组
   */
  constructor(elements: XMPPElement[]) {
    this.elements = elements;
  }

  /**
   * 集合中元素的数量。
   */
  public get length(): number {
    return this.elements.length;
  }

  /**
   * 通过索引获取集合中的元素。
   * @param index 元素的索引
   * @returns 对应的 XMPPElement 或 null
   */
  public item(index: number): XMPPElement | null {
    return this.elements[index] || null;
  }

  /**
   * 使集合可迭代，支持 for...of 循环。
   */
  [Symbol.iterator](): Iterator<XMPPElement> {
    return this.elements[Symbol.iterator]();
  }
}

/**
 * DOM-inspired XML 元素（XMPP/LTX）。
 * 命名与常用行为贴近 DOM，但不是完整 WHATWG 实现。
 */
export class XMPPElement {
  public readonly tagName: string;
  private _parentNode: XMPPElement | null = null;
  /** 内部可写子节点列表 */
  private _childNodes: Node[] = [];
  /** 无原型属性表，允许安全使用 constructor、toString、__proto__ 等 XML 属性名。 */
  private readonly attrs: Record<string, string> = Object.create(null) as Record<string, string>;

  /**
   * TIP: 请使用 createElement / createElementNS 创建实例
   * @param tagName 元素的标签名
   * @param namespaceURI 元素的命名空间 URI
   * @param qualifiedName 元素的限定名
   */
  private constructor(
    tagName?: string,
    namespaceURI: string | null = null,
    qualifiedName?: string
  ) {
    if (qualifiedName && !tagName) {
      this.tagName = qualifiedName;
    } else if (tagName && !namespaceURI && !qualifiedName) {
      this.tagName = tagName;
    } else {
      throw new Error("必须提供 tagName 或 qualifiedName");
    }

    if (namespaceURI) {
      this.attrs[this.prefix ? `xmlns:${this.prefix}` : "xmlns"] = namespaceURI;
    }
  }

  /** 只读子节点列表（DOM 风格） */
  public get childNodes(): readonly Node[] {
    return this._childNodes;
  }

  /**
   * 获取元素标签名的前缀 (e.g., "ns:tag" -> "ns")。
   */
  public get prefix(): string | null {
    const idx = this.tagName.indexOf(":");
    return idx >= 0 ? this.tagName.slice(0, idx) : null;
  }

  /**
   * 获取元素的命名空间 URI。
   */
  public get namespaceURI(): string | null {
    return this._findNS(this.prefix);
  }

  /**
   * 递归向上查找给定前缀的命名空间 URI。
   * @param prefix 要查找的前缀，null 表示默认命名空间。
   * @returns 命名空间 URI 或 null。
   */
  protected _findNS(prefix: string | null): string | null {
    if (prefix) {
      /* 带前缀的命名空间 */
      const attr = "xmlns:" + prefix;
      if (this.attrs[attr]) {
        return this.attrs[attr];
      } else if (this.parentElement) {
        return this.parentElement._findNS(prefix);
      }
    } else {
      /* 默认命名空间 */
      if (this.attrs.xmlns) {
        return this.attrs.xmlns;
      } else if (this.parentElement) {
        return this.parentElement._findNS(null);
      }
    }
    return null;
  }

  /**
   * 创建一个新的 XMPPElement 实例。
   * @param tagName 元素的标签名
   * @returns 新创建的 XMPPElement 实例
   */
  public static createElement(tagName: string): XMPPElement {
    return new XMPPElement(tagName);
  }

  public static createElementNS(
    namespaceURI: string,
    qualifiedName: string
  ): XMPPElement {
    return new XMPPElement(undefined, namespaceURI, qualifiedName);
  }

  /**
   * 获取不带前缀的本地名称 (e.g., "ns:tag" -> "tag")。
   */
  public get localName(): string {
    const idx = this.tagName.indexOf(":");
    return idx >= 0 ? this.tagName.slice(idx + 1) : this.tagName;
  }

  /**
   * 获取属性值。
   */
  public getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  /**
   * 设置属性值。
   */
  public setAttribute(name: string, val: string): this {
    this.attrs[name] = val;
    return this;
  }

  /**
   * DOM 风格：setAttributeNS(namespaceURI, qualifiedName, value)。
   * 本实现以 qualifiedName 为属性键存储（XMPP 实用简化）。
   * @param _namespaceURI 属性的命名空间 URI（签名兼容，当前未使用）
   * @param qualifiedName 属性的限定名 (e.g., "xml:lang")
   * @param value 属性值
   * @returns 当前元素实例
   */
  public setAttributeNS(
    _namespaceURI: string | null,
    qualifiedName: string,
    value: string
  ): this {
    /**
     * 在 LTX 风格中，我们通常直接使用 qualifiedName 作为属性键，
     * 因为命名空间声明（xmlns:prefix）本身就是属性。
     * 这里的逻辑与 setAttribute 类似，但提供了 DOM 兼容的签名。
     */
    this.attrs[qualifiedName] = value;
    return this;
  }

  /**
   * 移除属性。
   */
  public removeAttribute(name: string): this {
    delete this.attrs[name];
    return this;
  }

  /**
   * 获取第一个匹配的子元素（可指定本地名）。
   */
  private getChild(name: string): XMPPElement | undefined {
    return this.getChildren(name)[0];
  }

  /**
   * 返回所有匹配的直接子元素（不递归），可按名称过滤。
   */
  public getChildren(name: string): XMPPElement[] {
    const result: XMPPElement[] = [];
    for (const child of this._childNodes) {
      if (child instanceof XMPPElement && child.localName === name) {
        result.push(child);
      }
    }
    return result;
  }

  /**
   * 返回所有直接子元素（只包含元素节点），以 XMPPElementCollection 形式返回。
   */
  public get children(): XMPPElementCollection {
    const result: XMPPElement[] = [];
    for (const child of this._childNodes) {
      if (child instanceof XMPPElement) {
        result.push(child);
      }
    }
    return new XMPPElementCollection(result);
  }

  /**
   * 获取当前元素内所有文本内容。
   */
  public get textContent(): string {
    let text = "";
    for (const child of this._childNodes) {
      if (typeof child === "string") {
        text += child;
      } else if (child instanceof XMPPElement) {
        text += child.textContent;
      }
    }
    return text;
  }

  /**
   * 设置当前元素的文本内容。null 与空字符串都会清空全部子节点。
   */
  public set textContent(value: string | null) {
    for (const child of this._childNodes) {
      if (child instanceof XMPPElement) {
        child._parentNode = null;
      }
    }
    this._childNodes = value ? [value] : [];
  }

  /**
   * 递归获取所有匹配的后代元素。
   */
  public getElementsByTagName(tagName: string): XMPPElement[] {
    const result: XMPPElement[] = [];
    const traverse = (el: XMPPElement) => {
      for (const child of el._childNodes) {
        if (child instanceof XMPPElement) {
          // 支持通配符 '*' 或精确匹配
          if (tagName === "*" || child.tagName === tagName) {
            result.push(child);
          }
          // 继续递归
          traverse(child);
        }
      }
    };

    traverse(this);
    return result;
  }

  /**
   * DOM 风格：
   * - namespaceURI === "" 视为 null
   * - namespaceURI === "*" 匹配任意命名空间
   * - localName === "*" 匹配任意本地名
   */
  public getElementsByTagNameNS(
    namespaceURI: string | null,
    localName: string
  ): XMPPElement[] {
    const ns = namespaceURI === "" ? null : namespaceURI;
    const result: XMPPElement[] = [];
    const traverse = (el: XMPPElement) => {
      for (const child of el._childNodes) {
        if (child instanceof XMPPElement) {
          const nsMatch = ns === "*" || child.namespaceURI === ns;
          const nameMatch = localName === "*" || child.localName === localName;
          if (nsMatch && nameMatch) {
            result.push(child);
          }
          traverse(child);
        }
      }
    };
    traverse(this);
    return result;
  }

  /**
   * 创建一个新的子元素（DOM 标准风格：appendChild）
   */
  public appendChild(child: XMPPElement): XMPPElement {
    let ancestor = this.parentNode;
    while (ancestor && ancestor !== child) {
      ancestor = ancestor.parentNode;
    }
    // 禁止插入自身或祖先节点，避免形成循环引用
    if (child === this || ancestor === child) {
      throw new DOMException(
        "The new child would create a cycle in the node tree.",
        "HierarchyRequestError"
      );
    }

    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this._childNodes.push(child);
    child._parentNode = this;
    return child;
  }

  /**
   * 移除指定的子元素（DOM 标准风格：removeChild）
   */
  public removeChild(child: XMPPElement): XMPPElement {
    const idx = this._childNodes.indexOf(child);
    if (idx < 0) {
      throw new Error("The node to be removed is not a child of this node.");
    }
    this._childNodes.splice(idx, 1);
    child._parentNode = null;
    return child;
  }

  /** 返回父节点（没有父节点则返回 null）。 */
  public get parentNode(): XMPPElement | null {
    return this._parentNode;
  }

  /** 返回父元素（没有父元素则返回 null）。 */
  public get parentElement(): XMPPElement | null {
    return this._parentNode;
  }

  /** 追加任意节点（可传多个），并设置对象节点的 parent */
  public append(...nodes: Node[]): void {
    for (const node of nodes) {
      if (node instanceof XMPPElement) {
        this.appendChild(node);
      } else {
        this._childNodes.push(node);
      }
    }
  }

  /**
   * 将元素序列化为 XML 字符串，支持缩进格式化。
   * @param indent 缩进字符串或数字（数字表示空格数）
   * @param level 内部使用，当前缩进级别
   * @returns 格式化的 XML 字符串
   */
  public toXMLString(indent?: string | number, level: number = 2): string {
    if (typeof indent === "number") {
      indent = " ".repeat(indent);
    }

    let s = `<${this.tagName}`;

    // 添加属性
    for (const k in this.attrs) {
      const v = this.attrs[k];
      if (v != null) {
        s += ` ${k}="${escapeXML(v)}"`;
      }
    }

    const children_length = this._childNodes.length;

    if (children_length === 1 && typeof this._childNodes[0] === "string") {
      s += `>${escapeXMLText(this._childNodes[0])}</${this.tagName}>`;
    } else if (children_length > 0) {
      // 有多个子节点或子元素
      s += ">";
      for (const child of this._childNodes) {
        if (child == null) continue;

        if (indent) {
          s += "\n" + indent.repeat(level + 1);
        }

        if (typeof child === "string") {
          s += escapeXMLText(child);
        } else if (child instanceof XMPPElement) {
          s += child.toXMLString(indent, level + 1);
        }
      }

      if (indent) {
        s += "\n" + indent.repeat(level);
      }
      s += `</${this.tagName}>`;
    } else {
      // 空元素
      s += "/>";
    }

    return s;
  }

  /**
   * 写出元素起始标签、属性和结束标签（或自闭合）。
   * @param writer 写入函数
   */
  public write(writer: (chunk: string) => void): void {
    writer("<");
    writer(this.tagName);

    for (const k in this.attrs) {
      const v = this.attrs[k];
      if (v != null) {
        writer(" ");
        writer(k);
        writer('="');
        writer(escapeXML(v));
        writer('"');
      }
    }

    if (this._childNodes.length === 0) {
      writer("/>");
    } else {
      this._addChildren(writer);
    }
  }

  /**
   * 写出包含子节点的闭合部分（已进行文本转义）。
   */
  protected _addChildren(writer: (chunk: string) => void): void {
    writer(">");
    for (const child of this._childNodes) {
      if (child != null) {
        if (child instanceof XMPPElement) {
          child.write(writer);
        } else if (typeof child === "string") {
          writer(escapeXMLText(child));
        }
      }
    }
    writer("</");
    writer(this.tagName);
    writer(">");
  }
}