import { escapeXML, escapeXMLText } from "./escape.js";
// 定义节点类型，文本节点为 string 或 number，元素节点为 XMPPElement
export type Node = XMPPElement | string;

/**
 * XMPPElementCollection 类：表示一个只读的 XMPPElement 集合，类似于 DOM 的 HTMLCollection。
 * 避免暴露数组方法，防止与传统 DOM API 混淆。
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
 * XMPPElement 类：表示一个 XML/类似 LTX 的元素节点。
 */
export class XMPPElement {
  public readonly tagName: string;
  public parentNode: XMPPElement | null = null;
  public childNodes: Node[] = [];
  private attrs: Record<string, string> = {};

  /**
   * TIP: 请使用createElement方法创建实例
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
    const value = this.attrs[name];
    return value === undefined ? null : value;
  }

  /**
   * 设置属性值。
   */
  public setAttribute(name: string, val: string): this {
    this.attrs[name] = val;
    return this;
  }

  /**
   * 设置带命名空间的属性值 (DOM 标准风格：setAttributeNS)。
   * @param namespaceURI 属性的命名空间 URI
   * @param qualifiedName 属性的限定名 (e.g., "xml:lang")
   * @param value 属性值
   * @returns 当前元素实例
   */
  public setAttributeNS(
    namespaceURI: string | null,
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
    for (const child of this.childNodes) {
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
    for (const child of this.childNodes) {
      if (child instanceof XMPPElement) {
        result.push(child);
      }
    }
    return new XMPPElementCollection(result);
  }

  /**
   * 获取当前元素内所有文本内容（只拼接文本或数字类型的直接子节点）。
   */
  public get textContent(): string {
    let text = "";
    for (const child of this.childNodes) {
      if (typeof child === "string" || typeof child === "number") {
        text += child;
      }
    }
    return text;
  }

  /**
   * 设置当前元素的文本内容。
   */
  public set textContent(value: string) {
    // 移除所有子节点，并清除它们的 parentNode
    for (const child of this.childNodes) {
      if (child instanceof XMPPElement) {
        child.parentNode = null;
      }
    }
    // 设置新的子节点为单个文本节点
    this.childNodes = [value];
  }
  /**
   * 递归获取所有匹配的后代元素。
   */
  public getElementsByTagName(tagName: string): XMPPElement[] {
    const result: XMPPElement[] = [];
    // 使用内部函数递归，避免反复创建数组和展开
    const traverse = (el: XMPPElement) => {
      for (const child of el.childNodes) {
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

  public getElementsByTagNameNS(namespaceURI: string, localName: string): XMPPElement[] {
    const result: XMPPElement[] = [];
    const traverse = (el: XMPPElement) => {
      for (const child of el.childNodes) {
        if (child instanceof XMPPElement) {
          if (
            child.namespaceURI === namespaceURI &&
            (child.localName === localName || localName === "*")
          ) {
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
  public appendChild(XMPPElement: XMPPElement): XMPPElement {
    this.childNodes.push(XMPPElement);
    XMPPElement.parentNode = this;
    return XMPPElement;
  }

  /**
   * 移除指定的子元素（DOM 标准风格：removeChild）
   */
  public removeChild(XMPPElement: XMPPElement): XMPPElement {
    const idx = this.childNodes.indexOf(XMPPElement);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
      XMPPElement.parentNode = null;
    }
    return XMPPElement;
  }

  /** 返回最上层的根元素（递归向上）。DOM 风格别名：ownerDocument */
  public get ownerDocument(): XMPPElement {
    if (this.parentNode) {
      return this.parentNode.ownerDocument;
    }
    return this;
  }

  /** 返回父节点（没有父节点则返回 null）。DOM 风格别名：parentXMPPElement */
  public get parentElement(): XMPPElement | null {
    return this.parentNode;
  }

  /** 追加任意节点（可传多个），并设置对象节点的 parent */
  public append(...nodes: Node[]): void {
    for (const node of nodes) {
      this.childNodes.push(node);
      if (node instanceof XMPPElement) {
        node.parentNode = this;
      }
    }
  }

  /**
   * 将元素序列化为 XML 字符串，支持缩进格式化。
   * @param indent 缩进字符串或数字（数字表示空格数）
   * @param level 内部使用，当前缩进级别
   * @returns 格式化的 XML 字符串
   */
  public toXMLString(indent?: string | number, level: number = 0): string {
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

    const children_length = this.childNodes.length;

    // 只有一个文本子节点的情况
    if (children_length === 1 && typeof this.childNodes[0] === "string") {
      s += `>${escapeXMLText(String(this.childNodes[0]))}</${this.tagName}>`;
    } else if (children_length > 0) {
      // 有多个子节点或子元素
      s += ">";
      for (const child of this.childNodes) {
        if (child == null) continue;

        if (indent) {
          s += "\n" + indent.repeat(level + 1);
        }

        if (typeof child === "string") {
          s += escapeXMLText(child);
        } else if (typeof child === "number") {
          s += escapeXMLText(String(child));
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

    if (this.childNodes.length === 0) {
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
    for (const child of this.childNodes) {
      if (child != null) {
        if (child instanceof XMPPElement) {
          child.write(writer);
        } else if (typeof child === "string" || typeof child === "number") {
          writer(escapeXMLText(String(child)));
        }
      }
    }
    writer("</");
    writer(this.tagName);
    writer(">");
  }
}