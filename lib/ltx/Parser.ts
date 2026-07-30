import { EventEmitter } from "events";
import { XMPPElement } from "./Element.js";
import { LtxParser } from "./LtxParser.js";


interface ParserEvents {
  /** 当解析到完整的 Element 树时触发 */
  tree: [tree: XMPPElement];
  /** 当解析过程中发生错误时触发 */
  error: [error: Error];
  /** 当遇到开始标签时触发 */
  startElement: [name: string, attrs: Record<string, string>];
  /** 当遇到结束标签时触发 */
  endElement: [name: string, selfClosing: boolean];
}
// 扩展 EventEmitter 类型定义
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface Parser {
  on<K extends keyof ParserEvents>(
    event: K,
    listener: (...args: ParserEvents[K]) => void
  ): this;
  emit<K extends keyof ParserEvents>(
    event: K,
    ...args: ParserEvents[K]
  ): boolean;
}

/**
 * 基于 LtxParser 的 XML 解析器，构建 XMPPElement 树。
 * emit 事件：
 * - 'tree': 解析完成时触发，传递根 Element。
 * - 'error': 解析错误时触发，传递 Error 对象。
 * - 'startElement': 遇到开始标签时触发，传递标签名和属性。
 * - 'endElement': 遇到结束标签时触发，传递标签名和是否自闭合。
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Parser extends EventEmitter {
  public tree: XMPPElement | null = null;
  public error: Error | null = null;
  private parser?: LtxParser;
  private currentElement: XMPPElement | null = null;

  constructor() {
    super();
    this._setupParser();
  }

  /**
   * 初始化底层解析器并设置所有事件监听器。
   */
  private _setupParser(): void {
    // 创建底层解析器实例
    this.parser = new LtxParser();

    // startElement: 当遇到开始标签时创建一个新的 Element 实例
    this.parser.on("startElement", (name: string, attrs: Record<string, string>) => {
      this.emit("startElement", name, attrs);
      // 【XMPP流式处理】忽略顶层流头，使其不成为 Element 树的根节点。
      // 这样，后续的 Stanza (如 <features>) 将成为新的根节点，并在闭合时触发 'tree' 事件。
      if (!this.currentElement && name === "stream:stream") {
        return;
      }
      // 创建节点
      const child = XMPPElement.createElement(name);
      for (const k in attrs) {
        child.setAttribute(k, attrs[k]);
      }
      // 如果当前没有根节点，则 child 成为根；否则将 child 连接为当前节点的子节点
      this.currentElement = this.currentElement ? this.currentElement.appendChild(child) : child;
    });

    // endElement: 当遇到结束标签时，按层级回退或完成整棵树
    this.parser.on("endElement", (name: string, selfClosing: boolean) => {
      if (!this.currentElement) {
        // 无当前元素但收到了结束标签（不一致的文档）
        this.error = new Error(`Unexpected end tag: ${name}`);
        this.emit("error", this.error);
        return;
      }

      if (name === this.currentElement.tagName) {
        // 如果有父节点，回退到父节点；否则说明该节点可能是根节点
        if (this.currentElement.parentNode) {
          this.currentElement = this.currentElement.parentNode;
        } else {
          // 根节点完全闭合，保存为最终树并清空当前节点
          this.tree = this.currentElement;
          
          this.emit("tree", this.tree);
          this.currentElement = null;
        }
        this.emit("endElement", name, selfClosing);
      } else if (!selfClosing) {
        // 结束标签与当前元素名称不匹配（非自闭合标签）
        this.error = new Error(`Mismatched end tag: expected ${this.currentElement.tagName}, got ${name}`);
        this.emit("error", this.error);
      }
      // 如果是自闭合标签，el 已经在 startElement 中回退，无需额外处理
    });

    // text: 文本事件将内容追加到当前元素
    this.parser.on("text", (str: string) => {
      if (this.currentElement) {
        this.currentElement.append(str);
      }
    });

    // error: 底层解析器发生错误时，记录并向外部转发 error 事件
    this.parser.on("error", (e: Error) => {
      this.error = e;
      this.emit("error", e);
    });
  }

  /**
   * 重置解析器状态，以便可以解析新的 XML 文档。
   */
  public reset(): void {
    this.tree = null;
    this.error = null;
    this.currentElement = null;
    // 移除旧解析器的所有监听器，并创建一个新的 LtxParser 实例
    this.parser!.removeAllListeners();
    this._setupParser();
  }

  /**
   * write: 向底层解析器写入数据（流式解析）。
   */
  public write(data: string | Buffer): void {
    if (this.error) return;
    this.parser!.write(data);
  }

  /**
   * end: 结束输入并在没有错误时根据解析结果触发 'tree' 或 'error'。
   */
  public end(data?: string | Buffer): void {
    if (this.error) return;

    this.parser!.end(data);

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
   * @returns 解析后的 Element 树。
   */
  public static parse(data: string | Buffer): XMPPElement {
    // 允许传入一个自定义的 Parser 构造函数作为 options
    const p = new Parser();
    let result: XMPPElement | null = null;
    let error: Error | null = null;

    p.on("tree", (tree: XMPPElement) => {
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
