import { Node } from "./Node.ts";

interface IInput {
  type: "text" | "number" | "color";
  placeholder: string;
  readOnly: boolean;
  value: string;
  defaultValue: string;
  id: string;
}

class NodeBuilder {
  root: HTMLElement;
  content: HTMLElement;

  private _onPreInput: null | ((value: unknown, els: Map<string, HTMLElement>, sourceNode: Node) => void) = null;
  private _onPreOutput: null | ((els: Map<string, HTMLElement>) => unknown) = null;

  elements = new Map<string, HTMLElement>;

  constructor(public name = "[unnamed]") {
    this.root = document.createElement("node");
    this.content = document.createElement("node-content");
  }

  setTitle(text: string) {
    const titleEl = this.root.querySelector("node-title");

    if (titleEl) {
      titleEl.textContent = text;

      return this;
    }

    const el = document.createElement("node-title");
    el.textContent = text;

    this.root.prepend(el);

    return this;
  }

  input() {
    this.content = document.createElement("node-content");
    this.content.setAttribute("input", "");
    this.root.appendChild(this.content);

    return this;
  }

  output() {
    this.content = document.createElement("node-content");
    this.content.setAttribute("output", "");
    this.root.appendChild(this.content);

    return this;
  }

  addTextFieldElement(attrs: Partial<IInput>) {
    const el = document.createElement("input");

    if (attrs.id) {
      this.elements.set(attrs.id, el);
      el.dataset.localId = attrs.id;

      delete attrs.id;
    }

    if (attrs.value) {
      el.setAttribute("value", attrs.value);

      delete attrs.value;
    }

    if (attrs.defaultValue) {
      el.setAttribute("defaultValue", attrs.defaultValue);

      delete attrs.defaultValue;
    }

    Object.assign(el, attrs);
    this.content.appendChild(el);

    return this;
  }

  onInput(fun: (value: unknown, els: Map<string, HTMLElement>, sourceNode: Node) => void) {
    this._onPreInput = fun;

    return this;
  }

  onOutput(fun: (els: Map<string, HTMLElement>) => unknown) {
    this._onPreOutput = fun;

    return this;
  }

  build(): new () => Node {
    const name = this.name;
    const root = this.root;
    const elements = this.elements;
    const _onPreInput = this._onPreInput;
    const _onPreOutput = this._onPreOutput;

    const node = class extends Node {
      name: string = name;
      elements: Map<string, HTMLElement> = new Map(elements);

      render(): HTMLElement {
        const rootClone = root.cloneNode(true) as HTMLElement;

        this.elements.forEach((_val, key) => {
          this.elements.set(key, rootClone.querySelector(`[data-local-id=${key}]`) as HTMLElement);
        });

        return rootClone;
      }
    };

    if (_onPreInput !== null) {
      Object.defineProperty(node.prototype, "onInput", {
        value(value: unknown, sourceNode: Node) { _onPreInput.call(this, value, this.elements, sourceNode); }
      });
    }

    if (_onPreOutput !== null) {
      Object.defineProperty(node.prototype, "onOutput", {
        value() { return _onPreOutput.call(this, this.elements); }
      });
    }

    return node;
  }
}

export {
  NodeBuilder
};