// e:\git\ltx\src\Parser.ts

import { EventEmitter } from "events";
import { XMPPElement } from "./Element.js";
import { LtxParser } from "./LtxParser.js";

/**
 * Parser 类：封装底层流式解析器，并将解析事件聚合为完整的 Element 树结构或错误事件。
 */
export class Parser extends EventEmitter {
  public tree: XMPPElement | null = null;
  public error: Error | null = null;
  private readonly parser: LtxParser;

  constructor() {
    super();
    // 创建底层解析器实例
    this.parser = new LtxParser();

    let el: XMPPElement | undefined;

    // startElement: 当遇到开始标签时创建一个新的 Element 实例
    this.parser.on("startElement", (name: string, attrs: Record<string, string>) => {
      // 使用注入或默认的 ElementInterface 创建节点
      const child = XMPPElement.createElement(name);
      for (const k in attrs) {
        child.setAttribute(k, attrs[k]);
      }
      // 如果当前没有根节点，则 child 成为根；否则将 child 连接为当前节点的子节点
      el = el ? el.appendChild(child) : child;
    });

    // endElement: 当遇到结束标签时，按层级回退或完成整棵树
    this.parser.on("endElement", (name: string, selfClosing: boolean) => {
      if (!el) {
        // 无当前元素但收到了结束标签（不一致的文档）
        this.error = new Error(`Unexpected end tag: ${name}`);
        this.emit("error", this.error);
        return;
      }

      if (name === el.tagName) {
        // 如果有父节点，回退到父节点；否则说明该节点可能是根节点
        if (el.parentNode) {
          el = el.parentNode;
        } else if (!this.tree) {
          // 根节点完全闭合，保存为最终树并清空当前节点
          this.tree = el;
          el = undefined;
        }
      } else if (!selfClosing) {
        // 结束标签与当前元素名称不匹配（非自闭合标签）
        this.error = new Error(`Mismatched end tag: expected ${el.tagName}, got ${name}`);
        this.emit("error", this.error);
      }
      // 如果是自闭合标签，el 已经在 startElement 中回退，无需额外处理
    });

    // text: 文本事件将内容追加到当前元素
    this.parser.on("text", (str: string) => {
      if (el) {
        el.childNodes.push(str);
      }
    });

    // error: 底层解析器发生错误时，记录并向外部转发 error 事件
    this.parser.on("error", (e: Error) => {
      this.error = e;
      this.emit("error", e);
    });
  }

  /**
   * write: 向底层解析器写入数据（流式解析）。
   */
  public write(data: string | Buffer): void {
    if (this.error) return;
    this.parser.write(data);
  }

  /**
   * end: 结束输入并在没有错误时根据解析结果触发 'tree' 或 'error'。
   */
  public end(data?: string | Buffer): void {
    if (this.error) return;

    this.parser.end(data);

    if (!this.error) {
      if (this.tree) {
        // 解析成功，发送完整的解析树
        this.emit("tree", this.tree);
      } else {
        // 输入结束但未生成完整树（例如文档不完整），触发错误
        this.error = new Error("Incomplete document");
        this.emit("error", this.error);
      }
    }
  }

  /**
   * 同步解析 XML 字符串或 Buffer。
   * @param data 待解析的 XML 字符串或 Buffer。
   * @param options 可选的解析器配置。
   * @returns 解析后的 Element 树。
   */
  public static parse(data: string | Buffer): Element {
    // 允许传入一个自定义的 Parser 构造函数作为 options
    const p = new Parser();
    let result: Element | null = null;
    let error: Error | null = null;

    p.on("tree", (tree: Element) => {
      result = tree;
    });
    p.on("error", (e: Error) => {
      error = e;
    });

    p.write(data);
    p.end();

    if (error) {
      throw error;
    } else if (result) {
      return result;
    } else {
      // 理论上 end() 应该在没有 tree 时抛出 "Incomplete document" 错误，
      // 但为了安全起见，此处也抛出错误。
      throw new Error("Parsing failed to produce a document tree.");
    }
  }
}
